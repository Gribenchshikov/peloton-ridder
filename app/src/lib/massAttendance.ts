import { prisma } from "@/lib/prisma";

const MASS_DISTANCE_NAME = "Участие";

export async function ensureMassAttendanceDistance(eventId: string) {
  const existing = await prisma.distance.findFirst({
    where: { eventId },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.distance.create({
    data: {
      eventId,
      name: MASS_DISTANCE_NAME,
      km: 0,
      price: 0,
    },
    select: { id: true },
  });
}
