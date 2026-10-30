/**
 * Дата рождения на профиле: с 1 января 1920 года и не позже сегодняшнего дня.
 * Год вроде 0988 и несуществующие календарные даты отклоняются.
 * Уже сохранённые корректные даты эта проверка не переписывает.
 */

const CITY = /^(?!.*[<>])[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} .,'’()-]{0,99}$/u;
const LATIN_NAME = /^[A-Za-z][A-Za-z \-]*$/;
const BIRTH_MIN_YEAR = 1920;

export type ProfileText = string | null | undefined;

/** Поле отсутствует — не менять. Пустая строка — стереть. Иначе новое значение. */
export function optionalProfileText(value: FormDataEntryValue | null): ProfileText {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function parseCity(value: ProfileText): { ok: true; city: string | null | undefined } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, city: value };
  if (value.length > 100 || !CITY.test(value)) return { ok: false };
  return { ok: true, city: value };
}

export function parsePersonName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 100 || !LATIN_NAME.test(trimmed)) return null;
  return trimmed;
}

export function parseBirthDate(value: string, now = new Date()): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (!Number.isInteger(year) || year < BIRTH_MIN_YEAR) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (date.getTime() > today) return null;
  return date;
}

export function parsePhone(value: ProfileText): { ok: true; phone: string | null | undefined } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, phone: value };
  if (value.length > 30 || /[<>]/.test(value) || /[\u0000-\u001F\u007F]/.test(value)) return { ok: false };
  return { ok: true, phone: value };
}
