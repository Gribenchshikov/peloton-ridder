"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { parseParticipantRules, calcAge } from "@/types/participantRules";

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
      tx.event.findUnique({ where: { id: eventId } }),
      tx.distance.findUnique({ where: { id: distanceId } }),
    ]);
    if (!event || event.status !== "OPEN" || event.registrationDeadline < now) {
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
        OR: [
          { status: "PAID" },
          { status: "RESERVED", reservedUntil: { gt: now } },
        ],
      },
    });
    if (existing) return { kind: "existing" as const, registrationId: existing.id };

    const cancelled = await tx.registration.findFirst({
      where: { userId, eventId, status: "CANCELLED", isTransferOnly: false },
      orderBy: { createdAt: "desc" },
    });
    if (cancelled && cancelled.reregistrationCount >= 3) {
      return { kind: "error" as const, error: "registration_blocked" as const };
    }

    const activeCount = await tx.registration.count({
      where: {
        distanceId,
        OR: [
          { status: "PAID" },
          { status: "RESERVED", reservedUntil: { gt: now } },
        ],
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

    const includesTransfer = formData.get("includesTransfer") === "true";

    // Если дистанция требует квалификации — поле обязательно
    let qualificationUrl: string | null = null;
    if (distance.requiresQualification) {
      const raw = String(formData.get("qualificationUrl") ?? "").trim();
      if (!raw) return { kind: "error" as const, error: "qualification_missing" };
      qualificationUrl = raw;
    }

    // Парсим доп. участников для семейных/командных дистанций
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

    const reservationData = {
      isTransferOnly: false,
      distanceId,
      status: "RESERVED" as const,
      bibNumber: null,
      reservedUntil: new Date(now.getTime() + RESERVATION_TTL_MS),
      adminComment: null,
      allowReregistration: false,
      runningClubId,
      promoCodeId,
      discountAmount,
      includesTransfer,
      qualificationUrl,
      emergencyContact,
      additionalParticipants: additionalParticipants ?? undefined,
    };
    const registration = cancelled
      ? await tx.registration.update({ where: { id: cancelled.id }, data: { ...reservationData, reregistrationCount: { increment: 1 } } })
      : await tx.registration.create({ data: { userId, eventId, ...reservationData } });

    // Create RegistrationMerch entries for this event's merch items
    const eventMerch = await tx.event.findUnique({
      where: { id: eventId },
      select: { merchItems: { select: { id: true, requiresSize: true } } },
    });
    if (eventMerch?.merchItems.length) {
      const merchData: { registrationId: string; merchItemId: string; size: string | null }[] = [];
      for (const item of eventMerch.merchItems) {
        if (item.requiresSize) {
          const size = formData.get(`merch_size_${item.id}`);
          if (typeof size !== "string" || !VALID_SIZES.has(size)) {
            return { kind: "error" as const, error: "missing_size" as const };
          }
          merchData.push({ registrationId: registration.id, merchItemId: item.id, size });
        } else {
          merchData.push({ registrationId: registration.id, merchItemId: item.id, size: null });
        }
      }
      for (const merch of merchData) {
        await tx.registrationMerch.upsert({
          where: { registrationId_merchItemId: { registrationId: registration.id, merchItemId: merch.merchItemId } },
          create: merch,
          update: { size: merch.size },
        });
      }
    }

    return { kind: "created" as const, registrationId: registration.id };
  });

  if (outcome.kind === "error") return { error: outcome.error };
  return redirect({ href: `/pay/${outcome.registrationId}`, locale });
}
