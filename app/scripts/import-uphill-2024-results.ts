/**
 * Import Ridder UpHill 2024 finish protocol (semicolon CSV) into Result rows.
 *
 * Usage: npx tsx scripts/import-uphill-2024-results.ts [path-to-csv]
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const root = dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(resolve(root, "../.env"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const EVENT_YEAR = 2024;
const RACE_SLUG = "ridder-uphill";

const DISCIPLINE_TO_NAME: Record<string, string> = {
  skitour: "SkiTour",
  "лыжная гонка": "Лыжная гонка",
  skyrunning: "SkyRunning",
};

function parseKm(raw: string): number | null {
  const normalized = raw.trim().toLowerCase().replace(",", ".");
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*км$/);
  if (!match) return null;
  return Number(match[1]);
}

function parsePlace(raw: string): number | null {
  const value = raw.trim();
  if (!value || value === "В/К" || value === "н/с") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseTime(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length === 2) return `${parts[0]}:${parts[1]}`;
  if (parts.length === 3) return `${parts[0]}:${parts[1]}:${parts[2]}`;
  return value.replaceAll(".", ":");
}

function inferKm(distanceRaw: string, category: string, discipline: string): number | null {
  const parsed = parseKm(distanceRaw);
  if (parsed != null) return parsed;
  // A few protocol rows put the age group in the distance column.
  if (discipline === "skyrunning" && category === "Женщины 34-45") return 6.5;
  if (discipline === "skyrunning" && category === "Мужчины 55+") return 10;
  return null;
}

async function main() {
  const csvPath = process.argv[2] ?? "C:\\Users\\Виталий\\Downloads\\Ridder_UpHill_2024_with_discipline.csv";
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL не задан");

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const event = await prisma.event.findFirst({
      where: { year: EVENT_YEAR, race: { slug: RACE_SLUG } },
      include: { distances: true, race: { select: { name: true, slug: true } } },
    });
    if (!event) throw new Error(`Забег ${RACE_SLUG} ${EVENT_YEAR} не найден`);

    const distanceByKey = new Map(
      event.distances.map((d) => [`${d.name}|${d.km}`, d] as const),
    );

    const text = await readFile(csvPath, "utf8");
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) throw new Error("CSV пустой");

    const rows: {
      eventId: string;
      bibNumber: number;
      name: string;
      place: number | null;
      time: string | null;
      category: string | null;
      source: "EXCEL";
      distanceId: string;
    }[] = [];
    const skipped: string[] = [];

    for (const line of lines.slice(1)) {
      const cols = line.split(";").map((c) => c.trim());
      const [placeRaw, bibRaw, name, distanceRaw, timeRaw, categoryRaw, disciplineRaw] = cols;
      const bibNumber = Number(bibRaw);
      if (!bibNumber || Number.isNaN(bibNumber) || !name) {
        skipped.push(line);
        continue;
      }
      const discipline = (disciplineRaw ?? "").toLowerCase();
      const distanceName = DISCIPLINE_TO_NAME[discipline];
      const km = inferKm(distanceRaw ?? "", categoryRaw ?? "", discipline);
      if (!distanceName || km == null) {
        skipped.push(line);
        continue;
      }
      const distance = distanceByKey.get(`${distanceName}|${km}`);
      if (!distance) {
        skipped.push(line);
        continue;
      }
      if (parseKm(distanceRaw ?? "") == null) {
        console.warn(`Дистанция восстановлена (${distanceName} ${km} км): ${name}, №${bibNumber}`);
      }
      rows.push({
        eventId: event.id,
        bibNumber,
        name,
        place: parsePlace(placeRaw ?? ""),
        time: parseTime(timeRaw ?? ""),
        category: categoryRaw || null,
        source: "EXCEL",
        distanceId: distance.id,
      });
    }

    if (rows.length === 0) throw new Error("Не удалось разобрать ни одной строки");

    await prisma.$transaction([
      prisma.result.deleteMany({ where: { eventId: event.id, source: "EXCEL" } }),
      prisma.result.createMany({ data: rows }),
    ]);

    console.log(`${event.race.name} ${event.year}: импортировано ${rows.length} результатов`);
    if (skipped.length) {
      console.warn(`Пропущено строк: ${skipped.length}`);
      for (const line of skipped) console.warn(`  ${line}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
