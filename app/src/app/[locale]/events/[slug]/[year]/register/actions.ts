"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { parseParticipantRules, calcAge } from "@/types/participantRules";
import { CLEARED_PAYMENT_FIELDS } from "@/lib/refundPayout";
import { confirmPendingPaidInvoices } from "@/lib/apipay";
import { notifyFromRegistration } from "@/lib/userMessages";
import { activeRegistrationOrDraftWhere, capacityTakenWhere } from "@/lib/slotOccupancy";

const RESERVATION_TTL_MS = 30 * 60 * 1000;
const VALID_SIZES = new Set(["XS", "S", "M", "L", "XL", "XXL"]);

const emptyToNull = (v: unknown) => (v === "" || v == null ? null : v);

const CreateRegistrationSchema = z.object({
  eventId: z.string().min(1),
  distanceId: z.string().min(1),
  runningClubId: z.preprocess(emptyToNull, z.string().cuid().nullable()),
  promoCode: z.preprocess(emptyToNull, z.string().max(50).nullable()),
});

export type CreateRegistrationState = {
  error?: string;
};

export async function createRegistrationAction(
  locale: string,
  _prevState: CreateRegistrationState,
  formData: FormData,
): Promise<CreateRegistrationState> {
  // Check global registrations toggle before anything else
  const regOpenSetting = await prisma.siteSetting.findUnique({ where: { key: "registrations_open" } });
  if (regOpenSetting?.value === "false") {
    return { error: "registrations_closed" };
  }

  const userId = await requireUserId();
  if (!userId) {
    return { error: "unauthorized" };
  }

  const parsed = CreateRegistrationSchema.safeParse({
    eventId: formData.get("eventId"),
    distanceId: formData.get("distanceId"),
    runningClubId: formData.get("runningClubId"),
    promoCode: formData.get("promoCode"),
  });
  if (!parsed.success) {
    return { error: "invalid" };
  }
  const { eventId, distanceId, runningClubId, promoCode } = parsed.data;

  const birthDateRaw = formData.get("birthDate");
  if (birthDateRaw && typeof birthDateRaw === "string" && birthDateRaw.length > 0) {
    const parsed = new Date(birthDateRaw);
    if (!isNaN(parsed.getTime())) {
      await prisma.user.update({ where: { id: userId }, data: { birthDate: parsed } });
    }
  }

  const now = new Date();
  const includesTransfer = formData.get("includesTransfer") === "true";
  await confirmPendingPaidInvoices(eventId);
  const outcome = await prisma.$transaction(async (tx) => {
    // Одна учётная запись может иметь только одну активную регистрацию на
    // событие. Блокировка пользователя сериализует одновременные запросы в
    // разные дистанции одного события.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { emailVerified: true, birthDate: true } });
    if (!user) return { kind: "error" as const, error: "unauthorized" };
    // Проверяем здесь, а не только на странице: Server Action доступен по сети
    // и не должен полагаться на то, какой интерфейс показал браузер.
    if (!user.emailVerified) return { kind: "error" as const, error: "unverified" };

    // Блокируем строку дистанции до подсчёта мест и создания брони. Так два
    // одновременных запроса не могут занять последнее место одновременно.
    await tx.$queryRaw`SELECT "id" FROM "Distance" WHERE "id" = ${distanceId} FOR UPDATE`;

    const [event, distance] = await Promise.all([
      tx.event.findUnique({
        where: { id: eventId },
        include: { race: { select: { isMass: true, slug: true } } },
      }),
      tx.distance.findUnique({ where: { id: distanceId } }),
    ]);
    if (!event || event.status !== "OPEN") {
      return { kind: "error" as const, error: "closed" };
    }
    if (!distance || distance.eventId !== eventId) {
      return { kind: "error" as const, error: "invalid" };
    }

    // Проверка возраста: считается на дату старта события
    const raceDate = event.dateISO;
    const rules = parseParticipantRules(distance.participantRules);

    if (rules && distance.participantsPerSlot > 1) {
      // Семейная/командная дистанция: проверяем по participantRules[0] для primary
      const primaryRule = rules[0];
      if (primaryRule.minAge !== null || primaryRule.maxAge !== null) {
        if (!user.birthDate) return { kind: "error" as const, error: "age_required" };
        const age = calcAge(user.birthDate, raceDate);
        if (primaryRule.minAge !== null && age < primaryRule.minAge) return { kind: "error" as const, error: "age_too_young" };
        if (primaryRule.maxAge !== null && age > primaryRule.maxAge) return { kind: "error" as const, error: "age_too_old" };
      }
    } else if (distance.minAge !== null || distance.maxAge !== null) {
      if (!user.birthDate) return { kind: "error" as const, error: "age_required" };
      const age = calcAge(user.birthDate, raceDate);
      if (distance.minAge !== null && age < distance.minAge) return { kind: "error" as const, error: "age_too_young" };
      if (distance.maxAge !== null && age > distance.maxAge) return { kind: "error" as const, error: "age_too_old" };
    }

    // Фоновая задача для этого не нужна: перед каждой новой регистрацией на
    // дистанцию освобождаем истёкшие брони в той же транзакции.
    await tx.registration.updateMany({
      where: { eventId, status: "RESERVED", reservedUntil: { lte: now } },
      data: { status: "CANCELLED", reservedUntil: null },
    });

    const existing = await tx.registration.findFirst({
      where: {
        userId,
        eventId,
        isTransferOnly: false,
        ...activeRegistrationOrDraftWhere(now),
      },
    });
    if (existing?.status === "PAID") {
      return {
        kind: "existing" as const,
        registrationId: existing.id,
        isMass: event.race.isMass,
        slug: event.race.slug,
        year: event.year,
      };
    }

    let qualificationUrl: string | null = null;
    if (distance.requiresQualification) {
      const raw = String(formData.get("qualificationUrl") ?? "").trim();
      if (!raw) return { kind: "error" as const, error: "qualification_missing" };
      qualificationUrl = raw;
    }

    type ExtraParticipant = { firstName: string; lastName: string; birthDate: string };
    let additionalParticipants: ExtraParticipant[] | null = null;
    const extraCount = (distance.participantsPerSlot ?? 1) - 1;
    if (extraCount > 0 && rules) {
      const extras: ExtraParticipant[] = [];
      for (let i = 0; i < extraCount; i++) {
        const firstName = String(formData.get(`extra_firstName_${i}`) ?? "").trim();
        const lastName = String(formData.get(`extra_lastName_${i}`) ?? "").trim();
        const birthDateStr = String(formData.get(`extra_birthDate_${i}`) ?? "").trim();
        const birthDate = new Date(birthDateStr);
        if (!firstName || !lastName || !birthDateStr || isNaN(birthDate.getTime())) {
          return { kind: "error" as const, error: "extra_age_required" };
        }
        const rule = rules[i + 1];
        if (rule) {
          const age = calcAge(birthDate, raceDate);
          if (rule.minAge !== null && age < rule.minAge) return { kind: "error" as const, error: "extra_age_too_young" };
          if (rule.maxAge !== null && age > rule.maxAge) return { kind: "error" as const, error: "extra_age_too_old" };
        }
        extras.push({ firstName, lastName, birthDate: birthDateStr });
      }
      additionalParticipants = extras;
    }

    const emergencyContact = String(formData.get("emergencyContact") ?? "").trim() || null;
    const emergencyContactName = String(formData.get("emergencyContactName") ?? "").trim() || null;

    if (existing?.status === "RESERVED") {
      const amountChanged =
        existing.distanceId !== distanceId || existing.includesTransfer !== includesTransfer;
      const registration = await tx.registration.update({
        where: { id: existing.id },
        data: {
          distanceId,
          includesTransfer,
          runningClubId,
          qualificationUrl,
          emergencyContact,
          emergencyContactName,
          additionalParticipants: additionalParticipants ?? undefined,
          reservedUntil: event.race.isMass ? null : new Date(now.getTime() + RESERVATION_TTL_MS),
          ...(amountChanged ? CLEARED_PAYMENT_FIELDS : {}),
        },
      });
      const merchError = await upsertRegistrationMerch(tx, eventId, registration.id, formData);
      if (merchError) return merchError;
      return {
        kind: "created" as const,
        registrationId: registration.id,
        isMass: event.race.isMass,
        slug: event.race.slug,
        year: event.year,
      };
    }

    const cancelled = await tx.registration.findFirst({
      where: { userId, eventId, status: "CANCELLED", isTransferOnly: false },
      orderBy: { createdAt: "desc" },
    });
    if (cancelled) {
      const slotRefunded = await tx.refundRequest.findFirst({
        where: { registrationId: cancelled.id, type: "SLOT", status: "CONFIRMED" },
        select: { id: true },
      });
      if (slotRefunded && !cancelled.allowReregistration) {
        return { kind: "error" as const, error: "reregistration_not_allowed" as const };
      }
    }

    const activeCount = await tx.registration.count({
      where: {
        distanceId,
        isTransferOnly: false,
        ...capacityTakenWhere(event.race.isMass, now),
      },
    });
    const bibCapacity = (distance.bibRangeStart !== null && distance.bibRangeEnd !== null) ? distance.bibRangeEnd - distance.bibRangeStart + 1 : null;
    // maxSlots — явный лимит от организатора; bib-диапазон — жёсткий потолок.
    const capacity = bibCapacity !== null
      ? (distance.maxSlots !== null ? Math.min(distance.maxSlots, bibCapacity) : bibCapacity)
      : distance.maxSlots;
    if (capacity !== null && activeCount >= capacity) return { kind: "error" as const, error: "full" };

    // Validate and apply promo code
    let promoCodeId: string | null = null;
    let discountAmount = 0;
    if (promoCode) {
      // Lock the promo code row before check+increment to prevent concurrent requests
      // from both passing maxUses and over-consuming a limited code.
      const [promoRow] = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "PromoCode" WHERE "code" = ${promoCode.toUpperCase()} FOR UPDATE`;
      const promo = promoRow ? await tx.promoCode.findUnique({ where: { id: promoRow.id } }) : null;
      if (!promo || !promo.active) return { kind: "error" as const, error: "promo_invalid" };
      if (promo.expiresAt && promo.expiresAt < now) return { kind: "error" as const, error: "promo_expired" };
      if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return { kind: "error" as const, error: "promo_exhausted" };
      if (promo.eventId !== null && promo.eventId !== eventId) return { kind: "error" as const, error: "promo_invalid" };

      promoCodeId = promo.id;
      discountAmount =
        promo.discountType === "PERCENT"
          ? Math.round((distance.price * promo.discountValue) / 100)
          : Math.min(promo.discountValue, distance.price);

      await tx.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
    }

    const reservationData = {
      isTransferOnly: false,
      distanceId,
      status: "RESERVED" as const,
      bibNumber: null,
      reservedUntil: event.race.isMass ? null : new Date(now.getTime() + RESERVATION_TTL_MS),
      adminComment: null,
      allowReregistration: false,
      runningClubId,
      promoCodeId,
      discountAmount,
      includesTransfer,
      qualificationUrl,
      emergencyContact,
      emergencyContactName,
      additionalParticipants: additionalParticipants ?? undefined,
      ...CLEARED_PAYMENT_FIELDS,
    };
    const registration = cancelled
      ? await tx.registration.update({ where: { id: cancelled.id }, data: { ...reservationData, reregistrationCount: { increment: 1 } } })
      : await tx.registration.create({ data: { userId, eventId, ...reservationData } });

    const merchError = await upsertRegistrationMerch(tx, eventId, registration.id, formData);
    if (merchError) return merchError;

    return {
      kind: "created" as const,
      registrationId: registration.id,
      isMass: event.race.isMass,
      slug: event.race.slug,
      year: event.year,
    };
  });

  if (outcome.kind === "error") return { error: outcome.error };
  if (outcome.isMass) {
    if (outcome.kind === "created") {
      await notifyFromRegistration(outcome.registrationId, "REGISTRATION");
    }
    return redirect({ href: `/events/${outcome.slug}/${outcome.year}/register`, locale });
  }
  return redirect({ href: `/pay/${outcome.registrationId}`, locale });
}

async function upsertRegistrationMerch(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  eventId: string,
  registrationId: string,
  formData: FormData,
): Promise<{ kind: "error"; error: "missing_size" } | null> {
  const eventMerch = await tx.event.findUnique({
    where: { id: eventId },
    select: { merchItems: { select: { id: true, requiresSize: true } } },
  });
  if (!eventMerch?.merchItems.length) return null;
  const merchData: { registrationId: string; merchItemId: string; size: string | null }[] = [];
  for (const item of eventMerch.merchItems) {
    if (item.requiresSize) {
      const size = formData.get(`merch_size_${item.id}`);
      if (typeof size !== "string" || !VALID_SIZES.has(size)) {
        return { kind: "error", error: "missing_size" };
      }
      merchData.push({ registrationId, merchItemId: item.id, size });
    } else {
      merchData.push({ registrationId, merchItemId: item.id, size: null });
    }
  }
  for (const merch of merchData) {
    await tx.registrationMerch.upsert({
      where: { registrationId_merchItemId: { registrationId, merchItemId: merch.merchItemId } },
      create: merch,
      update: { size: merch.size },
    });
  }
  return null;
}
