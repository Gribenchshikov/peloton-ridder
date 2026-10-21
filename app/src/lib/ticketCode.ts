import { createHmac, timingSafeEqual } from "node:crypto";

const SCAN_PREFIX = "RIDDER1.";

export function kitScanSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  const value = env.SCAN_TOKEN_SECRET || env.AUTH_SECRET;
  return value && value.length >= 16 ? value : null;
}

function scanMac(registrationId: string, secret: string) {
  return createHmac("sha256", secret).update(registrationId).digest("hex").slice(0, 32);
}

/** Подписанный QR. Идентификатор сам по себе билет не открывает. */
export function kitScanToken(registrationId: string, secret: string) {
  return `${SCAN_PREFIX}${registrationId}.${scanMac(registrationId, secret)}`;
}

export function registrationIdFromKitScanToken(token: string, secret: string): string | null {
  if (!token.startsWith(SCAN_PREFIX)) return null;
  const rest = token.slice(SCAN_PREFIX.length);
  const dot = rest.lastIndexOf(".");
  if (dot <= 0) return null;
  const registrationId = rest.slice(0, dot);
  const mac = rest.slice(dot + 1);
  const expected = scanMac(registrationId, secret);
  const got = Buffer.from(mac);
  const exp = Buffer.from(expected);
  if (got.length !== exp.length) return null;
  return timingSafeEqual(got, exp) ? registrationId : null;
}

/** Код на билете: последние 6 символов id регистрации в виде ABC-DEF. */
export function formatTicketShortCode(registrationId: string): string {
  const raw = registrationId.slice(-6).toUpperCase();
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

export type KitLookupQuery =
  | { kind: "code"; suffix: string }
  | { kind: "bib"; bibNumber: number };

/**
 * Ручной ввод в выдаче набора: код с билета (A1B-C2D / A1BC2D)
 * или стартовый номер (42, #42, 42-1 для слота на несколько человек).
 */
export function parseKitLookupQuery(raw: string): KitLookupQuery | null {
  const upper = raw.trim().toUpperCase().replace(/^#/, "").replace(/\s+/g, "");
  if (!upper) return null;

  const compact = upper.replace(/-/g, "");
  const hyphenatedCode = /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(upper);
  const compactCode = /^[A-Z0-9]{6}$/.test(compact) && /[A-Z]/.test(compact);
  if (hyphenatedCode || compactCode) {
    return { kind: "code", suffix: compact.toLowerCase() };
  }

  const bibPart = upper.split("-")[0];
  const bibNumber = Number(bibPart);
  if (Number.isInteger(bibNumber) && bibNumber > 0) {
    return { kind: "bib", bibNumber };
  }
  return null;
}
