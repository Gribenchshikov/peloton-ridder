/**
 * Политика блокировки входа по паролю.
 *
 * По умолчанию 5 неудачных попыток за 15 минут, затем блокировка на 15 минут.
 * Лимит IP и лимит email считаются отдельно. Успешный вход сбрасывает только
 * счётчик email. Параметры: LOGIN_FAILURE_LIMIT, LOGIN_IP_FAILURE_LIMIT,
 * LOGIN_EMAIL_FAILURE_LIMIT, LOGIN_FAILURE_WINDOW_MINUTES, LOGIN_LOCKOUT_MINUTES.
 *
 * Auth.js в authorize() не умеет вернуть HTTP-статус. Поэтому сам callback
 * /api/auth/callback/credentials отвечает 429 и Retry-After, если блокировка
 * уже действует. Пока лимит не исчерпан, неверный пароль выглядит так же,
 * как неизвестный email.
 */

export type ThrottleScope = "ip" | "email";

export type ThrottleState = {
  failures: number;
  windowStart: number;
  lockedUntil: number | null;
};

export type ThrottlePolicy = {
  limit: number;
  windowMs: number;
  lockoutMs: number;
};

export type ThrottleTake = {
  state: ThrottleState;
  /** Попытка пришла, когда блокировка уже действовала. Пароль проверять не нужно. */
  blockedBefore: boolean;
  retryAfterSeconds: number;
};

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MINUTES = 15;
const DEFAULT_LOCKOUT_MINUTES = 15;

function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 10_000) return fallback;
  return value;
}

export type ThrottleEnv = {
  [key: string]: string | undefined;
  LOGIN_FAILURE_LIMIT?: string;
  LOGIN_IP_FAILURE_LIMIT?: string;
  LOGIN_EMAIL_FAILURE_LIMIT?: string;
  LOGIN_FAILURE_WINDOW_MINUTES?: string;
  LOGIN_LOCKOUT_MINUTES?: string;
};

export function loginThrottlePolicy(scope: ThrottleScope, env: ThrottleEnv = process.env): ThrottlePolicy {
  const shared = positiveInt(env.LOGIN_FAILURE_LIMIT, DEFAULT_LIMIT);
  const limit = positiveInt(
    scope === "ip" ? env.LOGIN_IP_FAILURE_LIMIT : env.LOGIN_EMAIL_FAILURE_LIMIT,
    shared,
  );
  return {
    limit,
    windowMs: positiveInt(env.LOGIN_FAILURE_WINDOW_MINUTES, DEFAULT_WINDOW_MINUTES) * 60_000,
    lockoutMs: positiveInt(env.LOGIN_LOCKOUT_MINUTES, DEFAULT_LOCKOUT_MINUTES) * 60_000,
  };
}

export function normalizeLoginEmail(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().slice(0, 200);
}

export function lockStatus(state: ThrottleState | null, now: number): { locked: boolean; retryAfterSeconds: number } {
  if (!state?.lockedUntil || state.lockedUntil <= now) return { locked: false, retryAfterSeconds: 0 };
  return {
    locked: true,
    retryAfterSeconds: Math.max(1, Math.ceil((state.lockedUntil - now) / 1000)),
  };
}

/** Одна неудачная попытка. Уже действующая блокировка не продлевается. */
export function takeFailure(state: ThrottleState | null, now: number, policy: ThrottlePolicy): ThrottleTake {
  const active = lockStatus(state, now);
  if (active.locked && state) {
    return { state, blockedBefore: true, retryAfterSeconds: active.retryAfterSeconds };
  }
  // После окончания блокировки счётчик начинается заново, а не продолжается.
  const lockExpired = Boolean(state?.lockedUntil && state.lockedUntil <= now);
  const inWindow = Boolean(state && !lockExpired && now - state.windowStart < policy.windowMs);
  const failures = inWindow && state ? state.failures + 1 : 1;
  const windowStart = inWindow && state ? state.windowStart : now;
  const locked = failures >= policy.limit;
  const lockedUntil = locked ? now + policy.lockoutMs : null;
  return {
    state: { failures, windowStart, lockedUntil },
    blockedBefore: false,
    retryAfterSeconds: locked ? Math.max(1, Math.ceil(policy.lockoutMs / 1000)) : 0,
  };
}

export type ThrottleStore = {
  read(key: string): Promise<ThrottleState | null>;
  record(key: string, now: number, policy: ThrottlePolicy): Promise<ThrottleTake>;
  clear(key: string): Promise<void>;
};

/** Память процесса сериализует операции так же, как SELECT … FOR UPDATE. Только для тестов. */
export function createSerialThrottleStore(): ThrottleStore {
  const rows = new Map<string, ThrottleState>();
  let chain: Promise<void> = Promise.resolve();

  function exclusive<T>(run: () => T): Promise<T> {
    const result = chain.then(run);
    chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return {
    read(key) {
      return exclusive(() => rows.get(key) ?? null);
    },
    record(key, now, policy) {
      return exclusive(() => {
        const taken = takeFailure(rows.get(key) ?? null, now, policy);
        rows.set(key, taken.state);
        return taken;
      });
    },
    clear(key) {
      return exclusive(() => {
        rows.delete(key);
      });
    },
  };
}

export async function accountIsLocked(
  store: ThrottleStore,
  ip: string,
  email: string,
  now: number,
): Promise<{ locked: boolean; retryAfterSeconds: number }> {
  const [ipState, emailState] = await Promise.all([store.read(`ip:${ip}`), email ? store.read(`email:${email}`) : Promise.resolve(null)]);
  const ipLock = lockStatus(ipState, now);
  const emailLock = lockStatus(emailState, now);
  if (!ipLock.locked && !emailLock.locked) return { locked: false, retryAfterSeconds: 0 };
  return {
    locked: true,
    retryAfterSeconds: Math.max(ipLock.retryAfterSeconds, emailLock.retryAfterSeconds),
  };
}

export async function noteLoginFailure(
  store: ThrottleStore,
  ip: string,
  email: string,
  now: number,
  env: ThrottleEnv = process.env,
): Promise<{ locked: boolean; retryAfterSeconds: number }> {
  const ipTake = await store.record(`ip:${ip}`, now, loginThrottlePolicy("ip", env));
  const emailTake = email
    ? await store.record(`email:${email}`, now, loginThrottlePolicy("email", env))
    : null;
  const retryAfterSeconds = Math.max(ipTake.retryAfterSeconds, emailTake?.retryAfterSeconds ?? 0);
  const locked = lockStatus(ipTake.state, now).locked || (emailTake ? lockStatus(emailTake.state, now).locked : false);
  return { locked, retryAfterSeconds };
}
