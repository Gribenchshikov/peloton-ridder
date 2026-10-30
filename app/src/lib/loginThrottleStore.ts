import { prisma } from "@/lib/prisma";
import {
  accountIsLocked,
  lockStatus,
  loginThrottlePolicy,
  noteLoginFailure,
  takeFailure,
  type ThrottlePolicy,
  type ThrottleScope,
  type ThrottleState,
  type ThrottleStore,
  type ThrottleTake,
} from "@/lib/loginThrottle";

type Row = {
  failures: number;
  windowStart: Date;
  lockedUntil: Date | null;
};

function toState(row: Row | undefined): ThrottleState | null {
  if (!row) return null;
  return {
    failures: row.failures,
    windowStart: row.windowStart.getTime(),
    lockedUntil: row.lockedUntil ? row.lockedUntil.getTime() : null,
  };
}

async function mutate(scope: ThrottleScope, subject: string, now: Date, policy: ThrottlePolicy): Promise<ThrottleTake> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "LoginThrottle" ("scope", "subject", "failures", "windowStart", "updatedAt")
      VALUES (${scope}, ${subject}, 0, ${now}, ${now})
      ON CONFLICT ("scope", "subject") DO NOTHING
    `;
    const rows = await tx.$queryRaw<Row[]>`
      SELECT "failures", "windowStart", "lockedUntil"
      FROM "LoginThrottle"
      WHERE "scope" = ${scope} AND "subject" = ${subject}
      FOR UPDATE
    `;
    const taken = takeFailure(toState(rows[0]), now.getTime(), policy);
    const lockedUntil = taken.state.lockedUntil == null ? null : new Date(taken.state.lockedUntil);
    await tx.$executeRaw`
      UPDATE "LoginThrottle"
      SET "failures" = ${taken.state.failures},
          "windowStart" = ${new Date(taken.state.windowStart)},
          "lockedUntil" = ${lockedUntil},
          "updatedAt" = ${now}
      WHERE "scope" = ${scope} AND "subject" = ${subject}
    `;
    return taken;
  });
}

function postgresStore(): ThrottleStore {
  return {
    async read(key) {
      const split = key.indexOf(":");
      const scope = key.slice(0, split) as ThrottleScope;
      const subject = key.slice(split + 1);
      const row = await prisma.loginThrottle.findUnique({
        where: { scope_subject: { scope, subject } },
        select: { failures: true, windowStart: true, lockedUntil: true },
      });
      return row
        ? {
            failures: row.failures,
            windowStart: row.windowStart.getTime(),
            lockedUntil: row.lockedUntil ? row.lockedUntil.getTime() : null,
          }
        : null;
    },
    async record(key, nowMs, policy) {
      const split = key.indexOf(":");
      const scope = key.slice(0, split) as ThrottleScope;
      const subject = key.slice(split + 1);
      return mutate(scope, subject, new Date(nowMs), policy);
    },
    async clear(key) {
      const split = key.indexOf(":");
      const scope = key.slice(0, split);
      const subject = key.slice(split + 1);
      await prisma.loginThrottle.deleteMany({ where: { scope, subject } });
    },
  };
}

const store = postgresStore();

export async function readLoginLock(ip: string, email: string, now = Date.now()) {
  return accountIsLocked(store, ip, email, now);
}

export async function recordLoginFailure(ip: string, email: string, now = Date.now()) {
  return noteLoginFailure(store, ip, email, now);
}

/** После верного пароля. Общий лимит IP не трогаем. */
export async function clearEmailLoginFailures(email: string) {
  if (!email) return;
  await prisma.loginThrottle.deleteMany({ where: { scope: "email", subject: email } });
}

export function retryAfterHeader(retryAfterSeconds: number) {
  return String(Math.max(1, retryAfterSeconds));
}

export function loginLockedResponse(retryAfterSeconds: number) {
  return new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Retry-After": retryAfterHeader(retryAfterSeconds),
    },
  });
}

export { lockStatus, loginThrottlePolicy };
