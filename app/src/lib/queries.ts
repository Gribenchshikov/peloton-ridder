import { prisma } from "@/lib/prisma";

export function getSiteSetting(key: string) {
  return prisma.siteSetting.findUnique({ where: { key } }).then((r) => r?.value ?? null);
}

export function upsertSiteSetting(key: string, value: string) {
  return prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export function getHomeEvents() {
  return prisma.event.findMany({
    where: { status: { in: ["OPEN", "DRAFT"] } },
    include: { race: true, distances: true },
    orderBy: { dateISO: "asc" },
    take: 4,
  });
}

export async function getNextEvent() {
  const featured = await prisma.event.findFirst({
    where: { isFeatured: true, status: "OPEN" },
    include: { race: true, distances: true },
  });
  if (featured) return featured;
  return prisma.event.findFirst({
    where: { dateISO: { gte: new Date() }, status: "OPEN" },
    include: { race: true, distances: true },
    orderBy: { dateISO: "asc" },
  });
}

export function getAdminEvents() {
  return prisma.event.findMany({
    include: { race: true, distances: true },
    orderBy: { dateISO: "desc" },
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
      firstName: true,
      lastName: true,
      email: true,
      city: true,
      phone: true,
      isAdmin: true,
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

// Лёгкая версия getUserProfile для карточки «данные участника» на странице регистрации —
// без registrations (там до 20 записей с вложенными event/race/distance), которые эта карточка не показывает.
export function getUserContactInfo(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true, emailVerified: true, city: true, phone: true },
  });
}

export function getActiveRegistration(userId: string, eventId: string) {
  return prisma.registration.findFirst({
    // RESERVED — лишь временная бронь. Просроченная запись остаётся в истории со
    // статусом CANCELLED, но на экран оплаты и повторную регистрацию не влияет.
    where: {
      userId,
      eventId,
      OR: [
        { status: "PAID" },
        { status: "RESERVED", reservedUntil: { gt: new Date() } },
      ],
    },
  });
}

export function getRegistrationForPayment(id: string) {
  return prisma.registration.findUnique({
    where: { id },
    include: { distance: true, event: { include: { race: true } } },
  });
}

// Облегчённая версия getEventDetail для страницы регистрации — без eventPartners
// и без registrations (там полный User на каждую запись), которые эта страница не показывает.
export function getEventForRegistration(slug: string, year: number) {
  return prisma.event.findFirst({
    where: { year, race: { slug } },
    select: {
      id: true,
      year: true,
      status: true,
      registrationDeadline: true,
      race: { select: { name: true, slug: true } },
      distances: { orderBy: { km: "asc" } },
      merchItems: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, requiresSize: true },
      },
    },
  });
}

export function getUsersForAdmin() {
  return prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      emailVerified: true,
      isAdmin: true,
      bannedUntil: true,
      createdAt: true,
      _count: { select: { registrations: true } },
    },
    orderBy: [{ isAdmin: "desc" }, { createdAt: "asc" }],
  });
}

export function getRacesForAdmin() {
  return prisma.race.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export function getRacesListForAdmin() {
  return prisma.race.findMany({
    select: { id: true, name: true, slug: true, icon: true, color: true, _count: { select: { events: true } } },
    orderBy: { name: "asc" },
  });
}

export function getRaceForAdmin(id: string) {
  return prisma.race.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true, courseIntro: true, icon: true, color: true },
  });
}

export function getEventForAdmin(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: {
      race: { select: { name: true } },
      distances: {
        orderBy: { km: "asc" },
        select: {
          id: true,
          discipline: true,
          name: true,
          km: true,
          gain: true,
          price: true,
          maxSlots: true,
          minAge: true,
          maxAge: true,
          cutoffMinutes: true,
          requiresQualification: true,
          qualificationNote: true,
          requiresInsurance: true,
          bibRangeStart: true,
          bibRangeEnd: true,
          profileData: true,
          gpxUrl: true,
          aidStations: true,
          raceStartMinutes: true,
        },
      },
      merchItems: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, requiresSize: true, order: true },
      },
      eventPartners: { include: { partner: true } },
    },
  });
}

export function getEventWithRegistrationsBySlug(slug: string, year: number) {
  return prisma.event.findFirst({
    where: { year, race: { slug } },
    select: {
      id: true,
      year: true,
      race: { select: { name: true, slug: true } },
      distances: {
        orderBy: { km: "asc" },
        select: { id: true, name: true, km: true, bibRangeStart: true, bibRangeEnd: true },
      },
      registrations: {
        where: {
          OR: [
            { status: "PAID" },
            { status: "RESERVED", reservedUntil: { gt: new Date() } },
            { status: "CANCELLED" },
          ],
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          distance: { select: { id: true, name: true, km: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      },
    },
  });
}

export function getEventWithRegistrations(id: string) {
  return prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      year: true,
      race: { select: { name: true, slug: true } },
      distances: {
        orderBy: { km: "asc" },
        select: { id: true, name: true, km: true, bibRangeStart: true, bibRangeEnd: true },
      },
      registrations: {
        where: {
          OR: [
            { status: "PAID" },
            { status: "RESERVED", reservedUntil: { gt: new Date() } },
            { status: "CANCELLED" },
          ],
        },
        include: {
          user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          distance: { select: { id: true, name: true, km: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
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
