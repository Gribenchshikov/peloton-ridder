import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Пересчитывает номера всех оплаченных участников события в порядке создания
 * регистрации. Вызывать только внутри транзакции после блокировки нужных
 * дистанций: номера в одном пуле должны оставаться последовательными.
 */
export async function reassignPaidBibNumbers(
  db: Pick<PrismaClient, "registration">,
  eventId: string,
) {
  const registrations = await db.registration.findMany({
    where: { eventId, status: "PAID" },
    select: {
      id: true,
      distanceId: true,
      bibNumber: true,
      distance: { select: { bibRangeStart: true, bibRangeEnd: true } },
    },
    orderBy: [{ distanceId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  const nextByDistance = new Map<string, number>();
  for (const registration of registrations) {
    if (!registration.distanceId || !registration.distance) continue;
    const { bibRangeStart, bibRangeEnd } = registration.distance;
    if (bibRangeStart === null || bibRangeEnd === null) continue;
    const next = nextByDistance.get(registration.distanceId) ?? bibRangeStart;
    if (next > bibRangeEnd) {
      throw new Error(`Bib range exhausted for distance ${registration.distanceId}`);
    }
    if (registration.bibNumber !== next) {
      await db.registration.update({ where: { id: registration.id }, data: { bibNumber: next } });
    }
    nextByDistance.set(registration.distanceId, next + 1);
  }
}
