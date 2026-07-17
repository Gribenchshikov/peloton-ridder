/**
 * Seed реальными данными из docs/reglaments-summary.md (сезон 2026).
 * Сбрасывает Race/Series/SeriesRace/Event/Distance и создаёт заново —
 * безопасно на этом этапе, т.к. Registration/Waitlist/Result ещё не существуют.
 *
 * Пулы стартовых номеров (bibRangeStart/End) — placeholder-распределение
 * внутри общего лимита события: в регламентах указан только общий лимит
 * на событие, не по дистанциям (см. T30). Админ сможет поменять при
 * редактировании события.
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TZ = "+06:00";

async function main() {
  await prisma.distance.deleteMany();
  await prisma.event.deleteMany();
  await prisma.seriesRace.deleteMany();
  await prisma.series.deleteMany();
  await prisma.race.deleteMany();

  // ---------- Race: вечнозелёные шаблоны забегов ----------
  const uphill = await prisma.race.create({
    data: {
      slug: "ridder-uphill",
      name: "Ridder UpHill",
      courseIntro:
        "Старт с плато выше Литвиновки (2 район, г. Риддер). Четыре дисциплины на выбор — лыжная гонка, Ski tour, скиальпинизм, скайраннинг — в горной местности с реальным набором высоты.",
      equipment: [
        "Стартовый номер",
        "Головной убор",
        "Заряженный мобильный телефон",
        "Загруженный трек дистанции в навигационном устройстве",
        "Перчатки",
        "Солнцезащитные очки",
      ],
      landmarks: [],
      icon: "i-mountain",
      color: "#8A6D3B",
    },
  });

  const radon = await prisma.race.create({
    data: {
      slug: "radon-race",
      name: "Radon Race",
      courseIntro:
        "Старт от посёлка Серый Луг. Skyrunning (27 км) проходит через пик Ворошилова, пик Саво и Радоновое озеро; Hard Trail (23 км) — через Радоновое озеро; Radon Trail (9 км) — до Радонового озера и обратно.",
      equipment: [
        "Стартовый номер",
        "Кружка для воды (на ПП не будет стаканчиков)",
        "Ёмкость для воды",
        "Спасательное одеяло",
        "Головной убор",
        "Свисток",
        "Заряженный мобильный телефон",
        "Загруженный трек дистанции в навигационном устройстве",
        "Перчатки",
        "Влаго- и ветрозащитная куртка с капюшоном",
        "Водонепроницаемый налобный фонарь с запасными батарейками",
        "Солнцезащитные очки",
        "Рюкзак",
        "Трейловые кроссовки",
        "Трекинговые палки",
      ],
      landmarks: [],
      icon: "i-drop",
      color: "#29473B",
    },
  });

  const panorama = await prisma.race.create({
    data: {
      slug: "panorama-fall-run",
      name: "Panorama Fall Run",
      courseIntro:
        "Трасса проходит по тропе в районе ущелья реки Громотуха в сторону пика Ивановский Белок.",
      equipment: [
        "Стартовый номер",
        "Наполненная ёмкость для воды (не менее 1 литра)",
        "Запас питания",
        "Спасательное одеяло",
        "Головной убор",
        "Свисток",
        "Заряженный мобильный телефон",
        "Загруженный трек дистанции в навигационном устройстве",
        "Влаго- и ветрозащитная куртка с капюшоном",
        "Солнцезащитные очки",
        "Рюкзак",
        "Трейловые кроссовки",
        "Трекинговые палки",
      ],
      landmarks: [],
      icon: "i-leaf",
      color: "#E2531F",
    },
  });

  const ski = await prisma.race.create({
    data: {
      slug: "ski-summer-fest",
      name: "Ski Summer Fest",
      courseIntro:
        "Гонка на беговых лыжах коньковым ходом в районе Проходного белка, рядом со спортивной базой Ridder Hute, на высоте 1800–2000 м. Настоящий снег летом — не лыжероллеры.",
      equipment: ["Беговые лыжи", "Лыжные ботинки", "Палки"],
      landmarks: [],
      icon: "i-ski",
      color: "#7A8B6F",
    },
  });

  // ---------- Ridder Race Series: Radon Race → Ridder UpHill → Panorama Fall Run ----------
  // Хронологический порядок этапов внутри сезона: UpHill (март) → Radon (июль) → Panorama (сентябрь).
  // Ski Summer Fest сознательно не входит — реальный бренд клуба (@ridderraceseries), не наша выдумка.
  const series = await prisma.series.create({
    data: { name: "Ridder Race Series", description: "Общий сезонный зачёт трёх из четырёх забегов клуба." },
  });
  await prisma.seriesRace.createMany({
    data: [
      { seriesId: series.id, raceId: uphill.id, stageOrder: 1 },
      { seriesId: series.id, raceId: radon.id, stageOrder: 2 },
      { seriesId: series.id, raceId: panorama.id, stageOrder: 3 },
    ],
  });

  // ---------- Event 2026 + Distance: Ridder UpHill (14 марта) ----------
  const uphillEvent = await prisma.event.create({
    data: {
      raceId: uphill.id,
      year: 2026,
      dateISO: new Date(`2026-03-14T10:00:00${TZ}`),
      status: "COMPLETED", // дата уже прошла относительно текущей даты сессии
      location: "Риддер, плато выше Литвиновки, 2 район",
      registrationDeadline: new Date(`2026-03-10T18:00:00${TZ}`),
      cancellationDeadline: new Date(`2026-03-06T18:00:00${TZ}`),
      medicalCancellationDeadline: new Date(`2026-03-11T18:00:00${TZ}`),
      resultsUrl: null, // публикуется в Instagram, не через myrace.info
    },
  });
  await prisma.distance.createMany({
    data: [
      { eventId: uphillEvent.id, discipline: "Лыжная гонка", name: "7 км (14-16 лет)", km: 7, minAge: 14, maxAge: 16, price: 7000, cutoffMinutes: 180, bibRangeStart: 1, bibRangeEnd: 25 },
      { eventId: uphillEvent.id, discipline: "Лыжная гонка", name: "7 км (16+)", km: 7, minAge: 16, price: 12000, cutoffMinutes: 180, bibRangeStart: 26, bibRangeEnd: 50 },
      { eventId: uphillEvent.id, discipline: "Лыжная гонка", name: "12 км (19+)", km: 12, minAge: 19, price: 18000, cutoffMinutes: 300, bibRangeStart: 51, bibRangeEnd: 75 },
      { eventId: uphillEvent.id, discipline: "Ski tour", name: "7 км (женщины / до 18 лет)", km: 7, maxAge: 18, price: 7000, cutoffMinutes: 180, bibRangeStart: 76, bibRangeEnd: 100 },
      { eventId: uphillEvent.id, discipline: "Ski tour", name: "7 км (16+)", km: 7, minAge: 16, price: 12000, cutoffMinutes: 180, bibRangeStart: 101, bibRangeEnd: 115 },
      { eventId: uphillEvent.id, discipline: "Ski tour", name: "12 км (мужчины, 19+)", km: 12, minAge: 19, price: 18000, cutoffMinutes: 300, bibRangeStart: 116, bibRangeEnd: 150 },
      { eventId: uphillEvent.id, discipline: "Скиальпинизм", name: "12 км (18+)", km: 12, minAge: 18, price: 18000, cutoffMinutes: 300, bibRangeStart: 151, bibRangeEnd: 175 },
      { eventId: uphillEvent.id, discipline: "Скайраннинг", name: "7 км (14-16 лет)", km: 7, minAge: 14, maxAge: 16, price: 7000, cutoffMinutes: 180, bibRangeStart: 176, bibRangeEnd: 200 },
      { eventId: uphillEvent.id, discipline: "Скайраннинг", name: "7 км (16+)", km: 7, minAge: 16, price: 12000, cutoffMinutes: 180, bibRangeStart: 201, bibRangeEnd: 235 },
      { eventId: uphillEvent.id, discipline: "Скайраннинг", name: "7 км (семья: ребёнок 10-13 + родитель)", km: 7, minAge: 10, maxAge: 13, price: 18000, cutoffMinutes: 180, bibRangeStart: 236, bibRangeEnd: 260 },
      { eventId: uphillEvent.id, discipline: "Скайраннинг", name: "12 км (19+)", km: 12, minAge: 19, price: 18000, cutoffMinutes: 300, bibRangeStart: 261, bibRangeEnd: 300 },
    ],
  });

  // ---------- Event 2026 + Distance: Ski Summer Fest (13 июня) ----------
  const skiEvent = await prisma.event.create({
    data: {
      raceId: ski.id,
      year: 2026,
      dateISO: new Date(`2026-06-13T10:00:00${TZ}`),
      status: "COMPLETED",
      location: "Риддер, Проходной белок, район спортбазы Ridder Hute",
      transferPrice: 15000,
      registrationDeadline: new Date(`2026-06-08T18:00:00${TZ}`),
      cancellationDeadline: new Date(`2026-06-10T18:00:00${TZ}`),
      medicalCancellationDeadline: new Date(`2026-06-11T18:00:00${TZ}`),
      resultsUrl: null,
    },
  });
  await prisma.distance.createMany({
    data: [
      { eventId: skiEvent.id, name: "3 км (начинающие, 14+)", km: 3, minAge: 14, price: 5000, bibRangeStart: 1, bibRangeEnd: 60 },
      { eventId: skiEvent.id, name: "10 км (16-18 лет)", km: 10, minAge: 16, maxAge: 18, price: 7000, bibRangeStart: 61, bibRangeEnd: 90 },
      { eventId: skiEvent.id, name: "10 км, женщины (18+)", km: 10, minAge: 18, price: 10000, bibRangeStart: 91, bibRangeEnd: 140 },
      { eventId: skiEvent.id, name: "15 км, мужчины (18+)", km: 15, minAge: 18, price: 10000, bibRangeStart: 141, bibRangeEnd: 200 },
    ],
  });

  // ---------- Event 2026 + Distance: Radon Race (5 июля) ----------
  const radonEvent = await prisma.event.create({
    data: {
      raceId: radon.id,
      year: 2026,
      dateISO: new Date(`2026-07-05T07:00:00${TZ}`),
      status: "COMPLETED",
      location: "Риддер, посёлок Серый Луг",
      transferPrice: 5000,
      registrationDeadline: new Date(`2026-07-01T18:00:00${TZ}`),
      cancellationDeadline: new Date(`2026-07-01T18:00:00${TZ}`),
      medicalCancellationDeadline: new Date(`2026-07-03T18:00:00${TZ}`),
      resultsUrl: "https://live.myrace.info/?f=bases/kz/2026/radonrace2026/radonrace2026.clax",
    },
  });
  await prisma.distance.createMany({
    data: [
      { eventId: radonEvent.id, name: "Radon Trail, 9 км", km: 9, gain: 800, minAge: 18, price: 15000, cutoffMinutes: 180, bibRangeStart: 1, bibRangeEnd: 50 },
      { eventId: radonEvent.id, name: "Radon Trail «Семейный», 9 км", km: 9, gain: 800, price: 20000, cutoffMinutes: 180, bibRangeStart: 51, bibRangeEnd: 100 },
      { eventId: radonEvent.id, name: "Hard Trail, 23 км", km: 23, gain: 1200, minAge: 18, price: 20000, cutoffMinutes: 360, bibRangeStart: 101, bibRangeEnd: 150 },
      { eventId: radonEvent.id, name: "Skyrunning, 27 км", km: 27, gain: 2200, minAge: 21, price: 30000, cutoffMinutes: 480, bibRangeStart: 151, bibRangeEnd: 200 },
    ],
  });

  // ---------- Event 2026 + Distance: Panorama Fall Run (19 сентября) ----------
  const panoramaEvent = await prisma.event.create({
    data: {
      raceId: panorama.id,
      year: 2026,
      dateISO: new Date(`2026-09-19T10:00:00${TZ}`),
      status: "OPEN",
      location: "Риддер, район ущелья реки Громотуха",
      transferPrice: 5000,
      registrationDeadline: new Date(`2026-09-15T18:00:00${TZ}`),
      cancellationDeadline: new Date(`2026-09-06T18:00:00${TZ}`),
      medicalCancellationDeadline: new Date(`2026-09-11T18:00:00${TZ}`),
      resultsUrl: null,
    },
  });
  await prisma.distance.createMany({
    data: [
      { eventId: panoramaEvent.id, name: "8 км", km: 8, minAge: 18, price: 15000, cutoffMinutes: 180, bibRangeStart: 1, bibRangeEnd: 100 },
      { eventId: panoramaEvent.id, name: "14 км", km: 14, minAge: 18, price: 22000, cutoffMinutes: 300, bibRangeStart: 101, bibRangeEnd: 200 },
    ],
  });

  console.log("Seed OK:", {
    races: 4,
    events: [uphillEvent.id, skiEvent.id, radonEvent.id, panoramaEvent.id].length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
