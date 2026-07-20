/**
 * Полный seed: забеги сезона 2025–2026, 50 бегунов, 10 волонтёров,
 * регистрации для тестирования QR-скана выдачи набора.
 */
import { PrismaClient, RegistrationStatus, VolunteerStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TZ = "+06:00";

// ─── Helpers ────────────────────────────────────────────────────────────────

function dob(year: number, month: number, day: number) {
  return new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T12:00:00Z`);
}

function dt(iso: string) {
  return new Date(`${iso}T00:00:00${TZ}`);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  // Сохраняем admins/боевых пользователей
  const adminEmails = (
    await prisma.user.findMany({ where: { isAdmin: true }, select: { email: true } })
  ).map((u) => u.email);

  // Очищаем seed-данные в правильном порядке
  await prisma.volunteerApplication.deleteMany();
  await prisma.registrationMerch.deleteMany();
  await prisma.registration.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.result.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.eventPartner.deleteMany();
  await prisma.merchItem.deleteMany();
  await prisma.distance.deleteMany();
  await prisma.event.deleteMany();
  await prisma.seriesRace.deleteMany();
  await prisma.series.deleteMany();
  await prisma.race.deleteMany();
  // Удаляем только seed-пользователей, не трогаем admins
  await prisma.user.deleteMany({
    where: { email: { endsWith: "@seed.ridder" } },
  });

  // ─── Забеги ───────────────────────────────────────────────────────────────

  const uphill = await prisma.race.create({
    data: {
      slug: "ridder-uphill",
      name: "Ridder UpHill",
      courseIntro:
        "Старт с плато выше Литвиновки (2 район, г. Риддер). Четыре дисциплины — лыжная гонка, Ski tour, скиальпинизм, скайраннинг — с реальным набором высоты от 700 до 1800 м над уровнем моря. Весенний снег, горный воздух и вид на хребты Западного Алтая.",
      equipment: [
        "Стартовый номер",
        "Головной убор",
        "Заряженный мобильный телефон",
        "Загруженный трек дистанции в навигационном устройстве",
        "Перчатки",
        "Солнцезащитные очки",
      ],
      landmarks: [
        { name: "Старт", description: "Плато выше Литвиновки, 1700 м" },
        { name: "Пик Белок", description: "Высшая точка трассы, 2200 м" },
        { name: "Финиш", description: "Стартовая поляна" },
      ],
      icon: "i-mountain",
      color: "#8A6D3B",
    },
  });

  const radon = await prisma.race.create({
    data: {
      slug: "radon-race",
      name: "Radon Race",
      courseIntro:
        "Старт от посёлка Серый Луг. Три дистанции на любой уровень: Radon Trail 9 км — идеально для дебютантов горного бега, Hard Trail 23 км — для опытных, Skyrunning 27 км — маршрут через пик Ворошилова и пик Саво с общим набором 2200 м. В конце каждой дистанции — Радоновое озеро на высоте 1900 м.",
      equipment: [
        "Стартовый номер",
        "Кружка (на ПП нет одноразовых стаканов)",
        "Ёмкость для воды не менее 0.5 л",
        "Спасательное одеяло",
        "Головной убор",
        "Свисток",
        "Заряженный мобильный телефон",
        "GPX-трек дистанции",
        "Перчатки",
        "Ветро- и влагозащитная куртка с капюшоном",
        "Налобный фонарь с запасными батарейками",
        "Солнцезащитные очки",
        "Рюкзак",
        "Трейловые кроссовки",
      ],
      landmarks: [
        { name: "Старт", description: "Посёлок Серый Луг, 700 м" },
        { name: "Радоновое озеро", description: "Финиш трассы 9 км / разворот 23 км и 27 км, 1900 м" },
        { name: "Пик Ворошилова", description: "Только для Skyrunning, 2700 м" },
      ],
      icon: "i-drop",
      color: "#29473B",
    },
  });

  const panorama = await prisma.race.create({
    data: {
      slug: "panorama-fall-run",
      name: "Panorama Fall Run",
      courseIntro:
        "Осенний трейл по горной тропе вдоль ущелья реки Громотуха в сторону пика Ивановский Белок. Дистанция 8 км — первый горный трейл в вашей жизни или семейный старт, 14 км — уже настоящая горная дистанция с набором 650 м. Золотая алтайская осень, пихты и лиственницы в цвете, чистый горный воздух.",
      equipment: [
        "Стартовый номер",
        "Ёмкость для воды не менее 1 л",
        "Запас питания",
        "Спасательное одеяло",
        "Головной убор",
        "Свисток",
        "Заряженный мобильный телефон",
        "GPX-трек дистанции",
        "Ветро- и влагозащитная куртка с капюшоном",
        "Солнцезащитные очки",
        "Рюкзак",
        "Трейловые кроссовки",
      ],
      landmarks: [
        { name: "Старт", description: "Ущелье реки Громотуха, 950 м" },
        { name: "Смотровая площадка", description: "Вид на г. Риддер и предгорья, 1350 м" },
        { name: "Пик Ивановский Белок (начало)", description: "Только для 14 км, 1600 м" },
        { name: "Финиш", description: "Стартовая поляна" },
      ],
      icon: "i-leaf",
      color: "#E2531F",
    },
  });

  const ski = await prisma.race.create({
    data: {
      slug: "ski-summer-fest",
      name: "Ski Summer Fest",
      courseIntro:
        "Единственная летняя гонка на беговых лыжах в Казахстане. Настоящий снег на Проходном белке (1800–2000 м) даже в июне. Коньковый ход, горный воздух и беговые лыжи — без лыжероллеров, без искусственного снега. Рядом со спортивной базой Ridder Hute.",
      equipment: ["Беговые лыжи", "Лыжные ботинки", "Лыжные палки", "Защитные очки"],
      landmarks: [
        { name: "База Ridder Hute", description: "Старт и финиш, 1800 м" },
        { name: "Высшая точка", description: "Открытое снежное плато, 2000 м" },
      ],
      icon: "i-ski",
      color: "#7A8B6F",
    },
  });

  // ─── Серия ────────────────────────────────────────────────────────────────

  const series = await prisma.series.create({
    data: {
      name: "Ridder Race Series",
      description:
        "Общий сезонный зачёт трёх горных стартов: Ridder UpHill (март), Radon Race (июль), Panorama Fall Run (сентябрь). Участники набирают очки по лучшим двум результатам из трёх этапов.",
    },
  });
  await prisma.seriesRace.createMany({
    data: [
      { seriesId: series.id, raceId: uphill.id, stageOrder: 1 },
      { seriesId: series.id, raceId: radon.id, stageOrder: 2 },
      { seriesId: series.id, raceId: panorama.id, stageOrder: 3 },
    ],
  });

  // ─── Events ───────────────────────────────────────────────────────────────

  // 1. Ridder UpHill 2025 — COMPLETED (прошлый год)
  const uphillEvent25 = await prisma.event.create({
    data: {
      raceId: uphill.id,
      year: 2025,
      dateISO: new Date(`2025-03-15T10:00:00${TZ}`),
      status: "COMPLETED",
      location: "Риддер, плато выше Литвиновки, 2 район",
      registrationDeadline: new Date(`2025-03-11T18:00:00${TZ}`),
      cancellationDeadline: new Date(`2025-03-07T18:00:00${TZ}`),
      medicalCancellationDeadline: new Date(`2025-03-12T18:00:00${TZ}`),
      isFeatured: false,
      aboutText:
        "Шестой год Ridder UpHill — снова рекорд участников. Погода порадовала: −5°С и плотный снег. Особый повод для гордости — впервые в истории старта более 30 участников на дистанции «Скайраннинг 12 км».",
    },
  });
  await prisma.distance.createMany({
    data: [
      { eventId: uphillEvent25.id, discipline: "Скайраннинг", name: "7 км (16+)", km: 7, minAge: 16, price: 12000, cutoffMinutes: 180, bibRangeStart: 1, bibRangeEnd: 60 },
      { eventId: uphillEvent25.id, discipline: "Скайраннинг", name: "12 км (19+)", km: 12, minAge: 19, price: 18000, cutoffMinutes: 300, bibRangeStart: 61, bibRangeEnd: 110 },
      { eventId: uphillEvent25.id, discipline: "Лыжная гонка", name: "7 км (16+)", km: 7, minAge: 16, price: 12000, cutoffMinutes: 180, bibRangeStart: 111, bibRangeEnd: 160 },
      { eventId: uphillEvent25.id, discipline: "Ski tour", name: "12 км (19+)", km: 12, minAge: 19, price: 18000, cutoffMinutes: 300, bibRangeStart: 161, bibRangeEnd: 200 },
    ],
  });

  // 2. Radon Race 2025 — COMPLETED
  const radonEvent25 = await prisma.event.create({
    data: {
      raceId: radon.id,
      year: 2025,
      dateISO: new Date(`2025-07-06T07:00:00${TZ}`),
      status: "COMPLETED",
      location: "Риддер, посёлок Серый Луг",
      transferPrice: 5000,
      registrationDeadline: new Date(`2025-07-02T18:00:00${TZ}`),
      cancellationDeadline: new Date(`2025-07-02T18:00:00${TZ}`),
      medicalCancellationDeadline: new Date(`2025-07-04T18:00:00${TZ}`),
      resultsUrl: "https://live.myrace.info/?f=bases/kz/2025/radonrace2025/radonrace2025.clax",
      aboutText:
        "Radon Race 2025 — 156 финишёров на трёх дистанциях. Рекорд трассы Skyrunning 27 км: 3:41:22. Впервые работал пункт питания с горячим чаем на Радоновом озере.",
      dayProgram: [
        { time: "06:00", description: "Выдача стартовых пакетов" },
        { time: "07:00", description: "Старт Skyrunning 27 км" },
        { time: "07:30", description: "Старт Hard Trail 23 км" },
        { time: "08:00", description: "Старт Radon Trail 9 км" },
        { time: "14:00", description: "Награждение и закрытие старта" },
      ],
    },
  });
  await prisma.distance.createMany({
    data: [
      { eventId: radonEvent25.id, name: "Radon Trail, 9 км", km: 9, gain: 800, minAge: 18, price: 15000, cutoffMinutes: 180, bibRangeStart: 1, bibRangeEnd: 80 },
      { eventId: radonEvent25.id, name: "Hard Trail, 23 км", km: 23, gain: 1200, minAge: 18, price: 20000, cutoffMinutes: 360, bibRangeStart: 81, bibRangeEnd: 140 },
      { eventId: radonEvent25.id, name: "Skyrunning, 27 км", km: 27, gain: 2200, minAge: 21, price: 30000, cutoffMinutes: 480, bibRangeStart: 141, bibRangeEnd: 200 },
    ],
  });

  // 3. Ridder UpHill 2026 — COMPLETED (в этом году, уже прошёл в марте)
  const uphillEvent26 = await prisma.event.create({
    data: {
      raceId: uphill.id,
      year: 2026,
      dateISO: new Date(`2026-03-14T10:00:00${TZ}`),
      status: "COMPLETED",
      location: "Риддер, плато выше Литвиновки, 2 район",
      registrationDeadline: new Date(`2026-03-10T18:00:00${TZ}`),
      cancellationDeadline: new Date(`2026-03-06T18:00:00${TZ}`),
      medicalCancellationDeadline: new Date(`2026-03-11T18:00:00${TZ}`),
      isFeatured: false,
      aboutText:
        "Седьмой год Ridder UpHill: 200+ участников, рекорд трассы на скайраннинг 12 км обновлён. В этом году впервые открыта дистанция для семейных команд.",
    },
  });
  await prisma.distance.createMany({
    data: [
      { eventId: uphillEvent26.id, discipline: "Лыжная гонка", name: "7 км (16+)", km: 7, minAge: 16, price: 12000, cutoffMinutes: 180, bibRangeStart: 1, bibRangeEnd: 60 },
      { eventId: uphillEvent26.id, discipline: "Лыжная гонка", name: "12 км (19+)", km: 12, minAge: 19, price: 18000, cutoffMinutes: 300, bibRangeStart: 61, bibRangeEnd: 100 },
      { eventId: uphillEvent26.id, discipline: "Скайраннинг", name: "7 км (16+)", km: 7, minAge: 16, price: 12000, cutoffMinutes: 180, bibRangeStart: 101, bibRangeEnd: 160 },
      { eventId: uphillEvent26.id, discipline: "Скайраннинг", name: "12 км (19+)", km: 12, minAge: 19, price: 18000, cutoffMinutes: 300, bibRangeStart: 161, bibRangeEnd: 210 },
      { eventId: uphillEvent26.id, discipline: "Ski tour", name: "12 км (19+)", km: 12, minAge: 19, price: 18000, cutoffMinutes: 300, bibRangeStart: 211, bibRangeEnd: 240 },
    ],
  });

  // 4. Radon Race 2026 — COMPLETED (июль, уже прошёл)
  const radonEvent26 = await prisma.event.create({
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
      aboutText:
        "Radon Race 2026 — юбилейный старт. 180 финишёров. Впервые введён семейный зачёт на 9 км. Все пункты питания с горячим питанием.",
      dayProgram: [
        { time: "06:00", description: "Регистрация и выдача стартовых пакетов" },
        { time: "07:00", description: "Старт Skyrunning 27 км" },
        { time: "07:30", description: "Старт Hard Trail 23 км" },
        { time: "08:00", description: "Старт Radon Trail 9 км" },
        { time: "08:30", description: "Старт Radon Trail «Семейный» 9 км" },
        { time: "15:00", description: "Награждение призёров и закрытие старта" },
      ],
    },
  });
  const radon9 = await prisma.distance.create({ data: { eventId: radonEvent26.id, name: "Radon Trail, 9 км", km: 9, gain: 800, minAge: 18, price: 15000, cutoffMinutes: 180, bibRangeStart: 1, bibRangeEnd: 80 } });
  const radon23 = await prisma.distance.create({ data: { eventId: radonEvent26.id, name: "Hard Trail, 23 км", km: 23, gain: 1200, minAge: 18, price: 20000, cutoffMinutes: 360, bibRangeStart: 81, bibRangeEnd: 140 } });
  const radon27 = await prisma.distance.create({ data: { eventId: radonEvent26.id, name: "Skyrunning, 27 км", km: 27, gain: 2200, minAge: 21, price: 30000, cutoffMinutes: 480, bibRangeStart: 141, bibRangeEnd: 200 } });

  // 5. Panorama Fall Run 2026 — OPEN (предстоящий — главный тестовый)
  const panoramaEvent = await prisma.event.create({
    data: {
      raceId: panorama.id,
      year: 2026,
      dateISO: new Date(`2026-09-19T10:00:00${TZ}`),
      status: "OPEN",
      location: "Риддер, ущелье реки Громотуха — поляна «Кордон»",
      transferPrice: 5000,
      registrationDeadline: new Date(`2026-09-15T18:00:00${TZ}`),
      cancellationDeadline: new Date(`2026-09-06T18:00:00${TZ}`),
      medicalCancellationDeadline: new Date(`2026-09-11T18:00:00${TZ}`),
      isFeatured: true,
      aboutText:
        "Panorama Fall Run — самый живописный старт сезона. Золото листвы, пихтовый лес и вид на Риддер с высоты 1350 м. Дистанция 8 км подходит для первого горного старта: техничный набор 350 м, асфальта нет. Дистанция 14 км — полноценный горный трейл с набором 650 м и двумя видовыми площадками. После финиша — горячий суп, чай и награждение.",
      dayProgram: [
        { time: "08:00", description: "Сбор участников, регистрация и выдача стартовых пакетов" },
        { time: "09:00", description: "Брифинг и инструктаж по безопасности" },
        { time: "09:30", description: "Старт 14 км" },
        { time: "10:00", description: "Старт 8 км" },
        { time: "12:30", description: "Первые финишёры 14 км" },
        { time: "13:00", description: "Закрытие финишного коридора 8 км" },
        { time: "14:00", description: "Закрытие финишного коридора 14 км" },
        { time: "14:30", description: "Награждение призёров в 3 возрастных категориях" },
        { time: "15:00", description: "Закрытие старта" },
      ],
      howToGet:
        "Выезд по трассе Риддер–Усть-Каменогорск в сторону посёлка Громотуха. На 7-м км за мостом — поворот направо по указателю «Кордон». Парковка на поляне. Координаты: 50.8341°N, 83.5127°E.",
      volunteerChatUrl: "https://t.me/+panorama2026volunteers",
    },
  });

  const panorama8 = await prisma.distance.create({
    data: {
      eventId: panoramaEvent.id,
      name: "8 км",
      km: 8,
      gain: 350,
      minAge: 16,
      price: 15000,
      maxSlots: 80,
      cutoffMinutes: 180,
      bibRangeStart: 1,
      bibRangeEnd: 100,
    },
  });
  const panorama14 = await prisma.distance.create({
    data: {
      eventId: panoramaEvent.id,
      name: "14 км",
      km: 14,
      gain: 650,
      minAge: 18,
      price: 22000,
      maxSlots: 60,
      cutoffMinutes: 300,
      bibRangeStart: 101,
      bibRangeEnd: 200,
    },
  });

  // Мерч для Panorama 2026
  const tshirt = await prisma.merchItem.create({
    data: { eventId: panoramaEvent.id, name: "Футболка участника", requiresSize: true, order: 1 },
  });
  await prisma.merchItem.create({
    data: { eventId: panoramaEvent.id, name: "Финишная медаль", requiresSize: false, order: 2 },
  });

  // ─── Пользователи ─────────────────────────────────────────────────────────

  const SIZES = ["XS", "S", "S", "M", "M", "M", "L", "L", "L", "XL", "XL", "XXL"] as const;
  const CITIES = ["Риддер", "Усть-Каменогорск", "Алматы", "Астана", "Семей", "Павлодар", "Шымкент", "Алматы", "Риддер", "Риддер"];

  const runners: Array<{ first: string; last: string; dob: Date; phone: string }> = [
    { first: "Айгерим",    last: "Сейткали",     dob: dob(1993,  4, 12), phone: "+7 777 100 0001" },
    { first: "Данияр",     last: "Асанов",        dob: dob(1989,  8, 22), phone: "+7 777 100 0002" },
    { first: "Жанна",      last: "Нурланова",     dob: dob(1995,  2, 14), phone: "+7 777 100 0003" },
    { first: "Максим",     last: "Петров",        dob: dob(1987,  6,  3), phone: "+7 777 100 0004" },
    { first: "Карина",     last: "Ахметова",      dob: dob(1998, 11, 28), phone: "+7 777 100 0005" },
    { first: "Сергей",     last: "Волков",        dob: dob(1982,  3, 17), phone: "+7 777 100 0006" },
    { first: "Алия",       last: "Жумабаева",     dob: dob(1996,  9,  5), phone: "+7 777 100 0007" },
    { first: "Ринат",      last: "Галиев",        dob: dob(1991,  1, 30), phone: "+7 777 100 0008" },
    { first: "Татьяна",    last: "Козлова",       dob: dob(1985, 12, 20), phone: "+7 777 100 0009" },
    { first: "Нуржан",     last: "Байтасов",      dob: dob(1994,  7,  8), phone: "+7 777 100 0010" },
    { first: "Елена",      last: "Соколова",      dob: dob(1988,  5, 15), phone: "+7 777 100 0011" },
    { first: "Бауыржан",   last: "Ерланов",       dob: dob(1990, 10, 11), phone: "+7 777 100 0012" },
    { first: "Анастасия",  last: "Новикова",      dob: dob(1997,  4, 25), phone: "+7 777 100 0013" },
    { first: "Арман",      last: "Сейткалиев",    dob: dob(1986,  2,  7), phone: "+7 777 100 0014" },
    { first: "Виктория",   last: "Ким",           dob: dob(1999,  8, 19), phone: "+7 777 100 0015" },
    { first: "Ержан",      last: "Қасымов",       dob: dob(1992,  6, 14), phone: "+7 777 100 0016" },
    { first: "Наталья",    last: "Иванова",       dob: dob(1983,  3,  2), phone: "+7 777 100 0017" },
    { first: "Самат",      last: "Мусин",         dob: dob(1995, 11, 16), phone: "+7 777 100 0018" },
    { first: "Юлия",       last: "Борисова",      dob: dob(1989,  9, 29), phone: "+7 777 100 0019" },
    { first: "Канат",      last: "Төлеуов",       dob: dob(1993,  1, 18), phone: "+7 777 100 0020" },
    { first: "Ирина",      last: "Семёнова",      dob: dob(1987,  7, 22), phone: "+7 777 100 0021" },
    { first: "Азамат",     last: "Бегалин",       dob: dob(1991, 12,  4), phone: "+7 777 100 0022" },
    { first: "Светлана",   last: "Орлова",        dob: dob(1984,  5,  9), phone: "+7 777 100 0023" },
    { first: "Нурболат",   last: "Смагулов",      dob: dob(1998,  3, 27), phone: "+7 777 100 0024" },
    { first: "Александра", last: "Новак",         dob: dob(1996, 10, 13), phone: "+7 777 100 0025" },
    { first: "Тимур",      last: "Ахметов",       dob: dob(1990,  8,  6), phone: "+7 777 100 0026" },
    { first: "Диана",      last: "Захарова",      dob: dob(1994,  6, 21), phone: "+7 777 100 0027" },
    { first: "Даулет",     last: "Кенжебаев",     dob: dob(1988,  4, 30), phone: "+7 777 100 0028" },
    { first: "Мария",      last: "Степанова",     dob: dob(1986, 11,  1), phone: "+7 777 100 0029" },
    { first: "Ринат",      last: "Сейдахметов",   dob: dob(1995,  2, 17), phone: "+7 777 100 0030" },
    { first: "Ольга",      last: "Морозова",      dob: dob(1992,  9, 10), phone: "+7 777 100 0031" },
    { first: "Нурлан",     last: "Ибраев",        dob: dob(1985,  7, 24), phone: "+7 777 100 0032" },
    { first: "Ксения",     last: "Яковлева",      dob: dob(1999,  5,  3), phone: "+7 777 100 0033" },
    { first: "Асхат",      last: "Даулетов",      dob: dob(1991,  1, 28), phone: "+7 777 100 0034" },
    { first: "Людмила",    last: "Полякова",      dob: dob(1983, 12,  7), phone: "+7 777 100 0035" },
    { first: "Берик",      last: "Сейткалиев",    dob: dob(1997,  4, 15), phone: "+7 777 100 0036" },
    { first: "Вероника",   last: "Чернова",       dob: dob(1993,  8, 20), phone: "+7 777 100 0037" },
    { first: "Ержан",      last: "Омаров",        dob: dob(1989,  6, 11), phone: "+7 777 100 0038" },
    { first: "Маргарита",  last: "Волкова",       dob: dob(1986, 10, 26), phone: "+7 777 100 0039" },
    { first: "Нурсултан",  last: "Ержанов",       dob: dob(1994,  3,  9), phone: "+7 777 100 0040" },
    { first: "Екатерина",  last: "Белова",        dob: dob(1990,  1, 31), phone: "+7 777 100 0041" },
    { first: "Алибек",     last: "Касымбеков",    dob: dob(1998,  9, 14), phone: "+7 777 100 0042" },
    { first: "Дарья",      last: "Романова",      dob: dob(1987,  7, 18), phone: "+7 777 100 0043" },
    { first: "Темиртас",   last: "Жанситов",      dob: dob(1992, 12, 22), phone: "+7 777 100 0044" },
    { first: "Полина",     last: "Герасимова",    dob: dob(1995,  5,  6), phone: "+7 777 100 0045" },
    { first: "Ильяс",      last: "Сейтжанов",     dob: dob(1988,  2, 19), phone: "+7 777 100 0046" },
    { first: "Оксана",     last: "Лебедева",      dob: dob(1984, 11, 13), phone: "+7 777 100 0047" },
    { first: "Азат",       last: "Жумабеков",     dob: dob(1996,  8, 27), phone: "+7 777 100 0048" },
    { first: "Валерия",    last: "Кузнецова",     dob: dob(1991,  4,  4), phone: "+7 777 100 0049" },
    { first: "Серик",      last: "Мухамедов",     dob: dob(1985,  6, 16), phone: "+7 777 100 0050" },
  ];

  const volunteers: Array<{ first: string; last: string; dob: Date; phone: string }> = [
    { first: "Айдос",     last: "Нурмагамбетов",  dob: dob(1993,  3, 12), phone: "+7 777 200 0001" },
    { first: "Зарина",    last: "Ахметова",        dob: dob(1997,  7, 22), phone: "+7 777 200 0002" },
    { first: "Павел",     last: "Сидоров",         dob: dob(1988,  9,  5), phone: "+7 777 200 0003" },
    { first: "Гульнара",  last: "Досова",          dob: dob(1994, 12, 18), phone: "+7 777 200 0004" },
    { first: "Андрей",    last: "Соколов",         dob: dob(1985,  6,  3), phone: "+7 777 200 0005" },
    { first: "Меруерт",   last: "Сейткалиева",     dob: dob(1999,  2, 27), phone: "+7 777 200 0006" },
    { first: "Роман",     last: "Алексеев",        dob: dob(1991, 10, 14), phone: "+7 777 200 0007" },
    { first: "Айгуль",    last: "Жаксыбекова",     dob: dob(1996,  4,  9), phone: "+7 777 200 0008" },
    { first: "Денис",     last: "Кузнецов",        dob: dob(1987,  8, 30), phone: "+7 777 200 0009" },
    { first: "Сандугаш",  last: "Нурланова",       dob: dob(1995, 11, 21), phone: "+7 777 200 0010" },
  ];

  // Создаём бегунов
  const runnerUsers = await Promise.all(
    runners.map((r, i) =>
      prisma.user.create({
        data: {
          email: `runner${String(i + 1).padStart(2, "0")}@seed.ridder`,
          passwordHash: "$2a$12$placeholderSeedHashNotForLogin000000000000000",
          firstName: r.first,
          lastName: r.last,
          birthDate: r.dob,
          phone: r.phone,
          city: CITIES[i % CITIES.length],
          tshirtSize: SIZES[i % SIZES.length],
          isVolunteer: false,
          emailVerified: new Date("2026-01-01"),
        },
      })
    )
  );

  // Создаём волонтёров
  const volunteerUsers = await Promise.all(
    volunteers.map((v, i) =>
      prisma.user.create({
        data: {
          email: `volunteer${String(i + 1).padStart(2, "0")}@seed.ridder`,
          passwordHash: "$2a$12$placeholderSeedHashNotForLogin000000000000000",
          firstName: v.first,
          lastName: v.last,
          birthDate: v.dob,
          phone: v.phone,
          city: CITIES[i % CITIES.length],
          tshirtSize: SIZES[(i * 3) % SIZES.length],
          isVolunteer: true,
          emailVerified: new Date("2026-01-01"),
        },
      })
    )
  );

  // ─── Регистрации на Panorama Fall Run 2026 ────────────────────────────────
  // 30 на 8 км (PAID), 10 на 14 км (PAID), 5 RESERVED, 5 CANCELLED
  // Из PAID 8 км: первые 5 уже получили набор (kitPickedUpAt)
  const panoramaRegs8 = await Promise.all(
    runnerUsers.slice(0, 30).map((u, i) =>
      prisma.registration.create({
        data: {
          userId: u.id,
          eventId: panoramaEvent.id,
          distanceId: panorama8.id,
          status: "PAID" as RegistrationStatus,
          bibNumber: i + 1,
          transferUsedAt: i < 8 ? new Date("2026-09-18T07:00:00+06:00") : null,
          kitPickedUpAt: i < 5 ? new Date("2026-09-19T08:30:00+06:00") : null,
          createdAt: new Date(`2026-08-${String(10 + i % 20).padStart(2, "0")}T10:00:00+06:00`),
        },
      })
    )
  );

  const panoramaRegs14 = await Promise.all(
    runnerUsers.slice(30, 40).map((u, i) =>
      prisma.registration.create({
        data: {
          userId: u.id,
          eventId: panoramaEvent.id,
          distanceId: panorama14.id,
          status: "PAID" as RegistrationStatus,
          bibNumber: 101 + i,
          transferUsedAt: i < 3 ? new Date("2026-09-18T07:00:00+06:00") : null,
          kitPickedUpAt: i < 2 ? new Date("2026-09-19T08:35:00+06:00") : null,
          createdAt: new Date(`2026-08-${String(15 + i).padStart(2, "0")}T10:00:00+06:00`),
        },
      })
    )
  );

  // RESERVED — 5 человек на 8 км
  await Promise.all(
    runnerUsers.slice(40, 45).map((u) =>
      prisma.registration.create({
        data: {
          userId: u.id,
          eventId: panoramaEvent.id,
          distanceId: panorama8.id,
          status: "RESERVED" as RegistrationStatus,
          reservedUntil: new Date("2026-09-15T23:59:59+06:00"),
          createdAt: new Date("2026-09-10T15:00:00+06:00"),
        },
      })
    )
  );

  // CANCELLED — 5 человек
  await Promise.all(
    runnerUsers.slice(45, 50).map((u) =>
      prisma.registration.create({
        data: {
          userId: u.id,
          eventId: panoramaEvent.id,
          distanceId: panorama8.id,
          status: "CANCELLED" as RegistrationStatus,
          cancelReason: "CANT_ATTEND",
          createdAt: new Date("2026-08-20T12:00:00+06:00"),
        },
      })
    )
  );

  // Мерч для PAID-регистраций
  const allPaidRegs = [...panoramaRegs8, ...panoramaRegs14];
  await Promise.all(
    allPaidRegs.map((reg, i) =>
      prisma.registrationMerch.create({
        data: {
          registrationId: reg.id,
          merchItemId: tshirt.id,
          size: SIZES[i % SIZES.length],
        },
      })
    )
  );

  // ─── Регистрации на Radon Race 2026 (исторические, PAID) ──────────────────
  await Promise.all([
    ...runnerUsers.slice(0, 15).map((u, i) =>
      prisma.registration.create({
        data: {
          userId: u.id,
          eventId: radonEvent26.id,
          distanceId: [radon9, radon9, radon23, radon23, radon27][i % 5].id,
          status: "PAID" as RegistrationStatus,
          bibNumber: i + 1,
          kitPickedUpAt: new Date("2026-07-05T06:45:00+06:00"),
          createdAt: new Date("2026-06-20T10:00:00+06:00"),
        },
      })
    ),
  ]);

  // ─── Волонтёрские заявки ───────────────────────────────────────────────────
  await Promise.all(
    volunteerUsers.map((u, i) =>
      prisma.volunteerApplication.create({
        data: {
          userId: u.id,
          eventId: panoramaEvent.id,
          status: (["APPROVED", "APPROVED", "APPROVED", "APPROVED", "APPROVED",
                    "PENDING",  "PENDING",  "PENDING",  "REJECTED", "APPROVED"] as VolunteerStatus[])[i],
          motivation: "Хочу помочь клубу и поддержать участников на трассе. Был(а) участником прошлого года — хочу попробовать себя с другой стороны.",
          experience: "Волонтёр на Radon Race 2025. Помогал(а) на ПП №2.",
          availability: "Весь день, с 6:00 до финиша",
          creditedAt: i < 5 ? new Date("2026-09-21T12:00:00+06:00") : null,
        },
      })
    )
  );

  console.log("✅ Seed завершён:");
  console.log(`   Забеги: 4 Race, 5 Event`);
  console.log(`   Пользователи: ${runnerUsers.length} бегунов + ${volunteerUsers.length} волонтёров`);
  console.log(`   Регистрации на Panorama 2026: 30 PAID (8 км) + 10 PAID (14 км) + 5 RESERVED + 5 CANCELLED`);
  console.log(`   Из них уже получили набор: 5 (8 км) + 2 (14 км) = 7 участников`);
  console.log(`   Трансфер заказали: 8 (8 км) + 3 (14 км) = 11 участников`);
  console.log(`   Admins не тронуты: ${adminEmails.join(", ") || "—"}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
