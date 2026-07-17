import { prisma } from "@/lib/prisma";

export function getHomeEvents() {
  return prisma.event.findMany({
    include: { race: true, distances: true },
    orderBy: { dateISO: "asc" },
  });
}

export function getNextEvent() {
  return prisma.event.findFirst({
    where: { dateISO: { gte: new Date() }, status: "OPEN" },
    include: { race: true, distances: true },
    orderBy: { dateISO: "asc" },
  });
}

export function getSeriesWithRaces() {
  return prisma.series.findFirst({
    include: { seriesRaces: { include: { race: true }, orderBy: { stageOrder: "asc" } } },
  });
}

const REGISTRATION_HISTORY_LIMIT = 20;

export function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      city: true,
      phone: true,
      registrations: {
        select: {
          id: true,
          status: true,
          bibNumber: true,
          createdAt: true,
          event: { select: { year: true, race: { select: { name: true, slug: true } } } },
          distance: { select: { name: true, km: true } },
        },
        orderBy: { createdAt: "desc" },
        take: REGISTRATION_HISTORY_LIMIT,
      },
    },
  });
}

export function getEventDetail(slug: string, year: number) {
  return prisma.event.findFirst({
    where: { year, race: { slug } },
    include: {
      race: true,
      distances: { orderBy: { km: "asc" } },
      eventPartners: { include: { partner: true } },
      registrations: {
        where: { status: "PAID" },
        include: { user: true, distance: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
