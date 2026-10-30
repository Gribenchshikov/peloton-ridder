/**
 * Публичный адрес забега: /{locale}/events/{slug}/{year}.
 * slug совпадает со схемой создания забега: 2–80 символов, [a-z0-9-].
 * Год — ровно четыре цифры в диапазоне 2000–2100. NaN, дроби и overflow сюда не доходят.
 */

const SLUG = /^[a-z0-9-]{2,80}$/;
const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

export function parseEventSlug(raw: string): string | null {
  if (typeof raw !== "string") return null;
  if (!SLUG.test(raw)) return null;
  return raw;
}

export function parseEventYear(raw: string): number | null {
  if (typeof raw !== "string" || !/^\d{4}$/.test(raw)) return null;
  const year = Number(raw);
  if (!Number.isSafeInteger(year) || year < YEAR_MIN || year > YEAR_MAX) return null;
  return year;
}

export function parseEventRoute(slug: string, year: string): { slug: string; year: number } | null {
  const parsedSlug = parseEventSlug(slug);
  const parsedYear = parseEventYear(year);
  if (!parsedSlug || parsedYear == null) return null;
  return { slug: parsedSlug, year: parsedYear };
}

/** Год уже приведён к числу вызывающим кодом. Некорректное значение не отдаём в Prisma. */
export function acceptEventLookup(slug: string, year: number): { slug: string; year: number } | null {
  if (typeof year !== "number" || !Number.isSafeInteger(year) || year < YEAR_MIN || year > YEAR_MAX) return null;
  const parsedSlug = parseEventSlug(slug);
  if (!parsedSlug) return null;
  return { slug: parsedSlug, year };
}
