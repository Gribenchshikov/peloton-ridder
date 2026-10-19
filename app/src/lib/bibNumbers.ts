import { prisma } from "@/lib/prisma";
import type { PrismaClient } from "@/generated/prisma/client";

type BibTx = {
  registration: PrismaClient["registration"];
  distance: PrismaClient["distance"];
  $queryRaw: PrismaClient["$queryRaw"];
};

async function nextFreeBib(
  db: Pick<PrismaClient, "registration">,
  distanceId: string,
  bibRangeStart: number | null,
  bibRangeEnd: number | null,
  exceptRegistrationId?: string,
) {
  const taken = await db.registration.findMany({
    where: {
      distanceId,
      status: "PAID",
      bibNumber: { not: null },
      ...(exceptRegistrationId ? { id: { not: exceptRegistrationId } } : {}),
    },
    select: { bibNumber: true },
  });
  const takenNumbers = new Set(taken.map((row) => row.bibNumber).filter((n): n is number => n != null));
  const start = bibRangeStart ?? 1;
  const end = bibRangeEnd ?? Number.MAX_SAFE_INTEGER;
  let candidate = start;
  while (takenNumbers.has(candidate) && candidate <= end) candidate++;
  return candidate <= end ? candidate : undefined;
}

/** Выдаёт следующий свободный номер внутри уже открытой транзакции. */
export async function assignPaidBibInTx(
  tx: BibTx,
  registration: {
    id: string;
    isTransferOnly: boolean;
    distanceId: string | null;
    bibNumber: number | null;
  },
): Promise<number | null> {
  if (registration.isTransferOnly || !registration.distanceId) return registration.bibNumber;
  if (registration.bibNumber != null) return registration.bibNumber;

  await tx.$queryRaw`SELECT "id" FROM "Distance" WHERE "id" = ${registration.distanceId} FOR UPDATE`;
  const distance = await tx.distance.findUnique({
    where: { id: registration.distanceId },
    select: { bibRangeStart: true, bibRangeEnd: true },
  });
  if (!distance) return null;

  const bibNumber = await nextFreeBib(
    tx,
    registration.distanceId,
    distance.bibRangeStart,
    distance.bibRangeEnd,
    registration.id,
  );
  if (bibNumber == null) return null;
  await tx.registration.update({ where: { id: registration.id }, data: { bibNumber } });
  return bibNumber;
}

/** Выдаёт номер оплаченному слоту, даже если диапазон номеров не задан. */
export async function ensurePaidBibNumber(registrationId: string): Promise<number | null> {
  return prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        status: true,
        bibNumber: true,
        isTransferOnly: true,
        distanceId: true,
      },
    });
    if (!registration || registration.status !== "PAID") {
      return registration?.bibNumber ?? null;
    }
    return assignPaidBibInTx(tx, registration);
  });
}

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
    where: { eventId, status: "PAID", isTransferOnly: false },
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
    if (!registration.distanceId) continue;
    const bibRangeStart = registration.distance?.bibRangeStart ?? 1;
    const bibRangeEnd = registration.distance?.bibRangeEnd ?? null;
    const next = nextByDistance.get(registration.distanceId) ?? bibRangeStart;
    if (bibRangeEnd != null && next > bibRangeEnd) {
      throw new Error(`Bib range exhausted for distance ${registration.distanceId}`);
    }
    if (registration.bibNumber !== next) {
      await db.registration.update({ where: { id: registration.id }, data: { bibNumber: next } });
    }
    nextByDistance.set(registration.distanceId, next + 1);
  }
}
