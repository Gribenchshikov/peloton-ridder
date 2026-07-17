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
