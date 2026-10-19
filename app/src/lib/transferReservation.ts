import { prisma } from "@/lib/prisma";

const TRANSFER_RESERVATION_TTL_MS = 30 * 60 * 1000;

/** Находит незавершённую оплату трансфера или создаёт новую бронь. */
export async function ensureTransferReservation(userId: string, eventId: string): Promise<string> {
  const reservedUntil = new Date(Date.now() + TRANSFER_RESERVATION_TTL_MS);
  const pending = await prisma.registration.findFirst({
    where: { userId, eventId, isTransferOnly: true, status: "RESERVED" },
    select: { id: true },
  });
  if (pending) {
    await prisma.registration.update({
      where: { id: pending.id },
      data: { reservedUntil, includesTransfer: true },
    });
    return pending.id;
  }
  const created = await prisma.registration.create({
    data: {
      userId,
      eventId,
      status: "RESERVED",
      isTransferOnly: true,
      includesTransfer: true,
      reservedUntil,
    },
    select: { id: true },
  });
  return created.id;
}

export function hasPaidTransferWhere(userId: string, eventId: string) {
  return {
    userId,
    eventId,
    status: "PAID" as const,
    OR: [{ isTransferOnly: true }, { includesTransfer: true }],
  };
}
