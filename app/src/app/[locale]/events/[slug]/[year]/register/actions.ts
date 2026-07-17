"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { getActiveRegistration } from "@/lib/queries";
import { redirect } from "@/i18n/navigation";

// Место держится забронированным (RESERVED) это время, пока не будет оплачено —
// после T15 (реальные вебхуки) сюда добавится фоновая очистка просроченных броней.
const RESERVATION_TTL_MS = 30 * 60 * 1000;

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

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "OPEN" || event.registrationDeadline < new Date()) {
    return { error: "closed" };
  }

  const distance = await prisma.distance.findUnique({ where: { id: distanceId } });
  if (!distance || distance.eventId !== eventId) {
    return { error: "invalid" };
  }

  const existing = await getActiveRegistration(userId, eventId);
  if (existing) {
    return redirect({ href: `/pay/${existing.id}`, locale });
  }

  const activeCount = await prisma.registration.count({
    where: { distanceId, status: { in: ["RESERVED", "PAID"] } },
  });
  const capacity = distance.bibRangeEnd - distance.bibRangeStart + 1;
  if (activeCount >= capacity) {
    return { error: "full" };
  }

  const registration = await prisma.registration.create({
    data: {
      userId,
      eventId,
      distanceId,
      status: "RESERVED",
      reservedUntil: new Date(Date.now() + RESERVATION_TTL_MS),
    },
  });

  return redirect({ href: `/pay/${registration.id}`, locale });
}
