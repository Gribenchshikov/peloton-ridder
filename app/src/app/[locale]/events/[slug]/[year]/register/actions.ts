"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";

const RESERVATION_TTL_MS = 30 * 60 * 1000;
const VALID_SIZES = new Set(["XS", "S", "M", "L", "XL", "XXL"]);

const CreateRegistrationSchema = z.object({
  eventId: z.string().min(1),
  distanceId: z.string().min(1),
});

export type CreateRegistrationState = {
  error?: string;
};

export async function createRegistrationAction(
  locale: string,
  _prevState: CreateRegistrationState,
  formData: FormData,
): Promise<CreateRegistrationState> {
  const userId = await requireUserId();
  if (!userId) {
    return { error: "unauthorized" };
  }

  const parsed = CreateRegistrationSchema.safeParse({
    eventId: formData.get("eventId"),
    distanceId: formData.get("distanceId"),
  });
  if (!parsed.success) {
    return { error: "invalid" };
  }
  const { eventId, distanceId } = parsed.data;

  const now = new Date();
  const outcome = await prisma.$transaction(async (tx) => {
    // Одна учётная запись может иметь только одну активную регистрацию на
    // событие. Блокировка пользователя сериализует одновременные запросы в
    // разные дистанции одного события.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
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
        OR: [
          { status: "PAID" },
          { status: "RESERVED", reservedUntil: { gt: now } },
        ],
      },
    });
    if (existing) return { kind: "existing" as const, registrationId: existing.id };

    const cancelled = await tx.registration.findFirst({
      where: { userId, eventId, status: "CANCELLED" },
      orderBy: { createdAt: "desc" },
    });
    if (cancelled && !cancelled.allowReregistration) {
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
    const capacity = distance.bibRangeEnd - distance.bibRangeStart + 1;
    if (activeCount >= capacity) return { kind: "error" as const, error: "full" };

    const reservationData = {
      distanceId,
      status: "RESERVED" as const,
      bibNumber: null,
      reservedUntil: new Date(now.getTime() + RESERVATION_TTL_MS),
      adminComment: null,
      allowReregistration: false,
    };
    const registration = cancelled
      ? await tx.registration.update({ where: { id: cancelled.id }, data: reservationData })
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
