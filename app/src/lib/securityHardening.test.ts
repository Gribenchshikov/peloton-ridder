import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accountIsLocked,
  createSerialThrottleStore,
  lockStatus,
  loginThrottlePolicy,
  normalizeLoginEmail,
  noteLoginFailure,
  takeFailure,
} from "./loginThrottle";
import { acceptEventLookup, parseEventRoute } from "./eventRoute";
import { optionalProfileText, parseBirthDate, parseCity, parsePersonName, parsePhone } from "./profileFields";
import { distanceBelongsToEvent, ownsRegistration } from "./ownership";
import { decidePaymentTransition } from "./apipayPayment";
import { registrationPaymentAmount } from "./paymentAmount";
import { contentSecurityPolicy, cspResponseHeaderName } from "./csp";
import { securityHeaders } from "./securityHeaders";
import { csvSafeCell, toCsv } from "./csv";
import { clientIp } from "./rateLimit";

const policy = { limit: 5, windowMs: 15 * 60_000, lockoutMs: 15 * 60_000 };
const now = 1_700_000_000_000;

test("five failed passwords lock the next attempt", () => {
  let state = null;
  for (let i = 0; i < 5; i += 1) {
    const taken = takeFailure(state, now + i, policy);
    assert.equal(taken.blockedBefore, false);
    state = taken.state;
  }
  assert.equal(lockStatus(state, now + 5).locked, true);
  const sixth = takeFailure(state, now + 6, policy);
  assert.equal(sixth.blockedBefore, true);
  assert.ok(sixth.retryAfterSeconds > 0);
  assert.equal(sixth.state.failures, 5);
});

test("parallel failures cannot slip past the limit", async () => {
  const store = createSerialThrottleStore();
  const results = await Promise.all(
    Array.from({ length: 20 }, () => store.record("email:runner@example.com", now, policy)),
  );
  const admitted = results.filter((result) => !result.blockedBefore);
  assert.equal(admitted.length, 5);
  assert.equal(results.at(-1)?.state.failures, 5);
  assert.equal(lockStatus(results.at(-1)?.state ?? null, now).locked, true);
});

test("different emails do not bypass the IP limit, and a successful login clears only the email", async () => {
  const store = createSerialThrottleStore();
  const env = {
    LOGIN_FAILURE_LIMIT: "5",
    LOGIN_FAILURE_WINDOW_MINUTES: "15",
    LOGIN_LOCKOUT_MINUTES: "15",
  };
  for (let i = 0; i < 5; i += 1) {
    await noteLoginFailure(store, "203.0.113.10", `user${i}@example.com`, now + i, env);
  }
  const blocked = await accountIsLocked(store, "203.0.113.10", "fresh@example.com", now + 6);
  assert.equal(blocked.locked, true);
  await store.clear("email:user0@example.com");
  const stillBlocked = await accountIsLocked(store, "203.0.113.10", "user0@example.com", now + 7);
  assert.equal(stillBlocked.locked, true);
});

test("an expired lock starts a new window", () => {
  const locked = takeFailure(
    { failures: 5, windowStart: now, lockedUntil: now + 1_000 },
    now + 1_001,
    policy,
  );
  assert.equal(locked.blockedBefore, false);
  assert.equal(locked.state.failures, 1);
  assert.equal(locked.state.lockedUntil, null);
});

test("unknown and known emails share one rejection shape", () => {
  assert.equal(normalizeLoginEmail("  Runner@Example.com "), "runner@example.com");
  assert.equal(normalizeLoginEmail("no-such-user@example.com"), normalizeLoginEmail("Runner@Example.com").replace("runner@example.com", "no-such-user@example.com"));
  assert.equal(loginThrottlePolicy("ip", {}).limit, 5);
  assert.equal(loginThrottlePolicy("email", { LOGIN_EMAIL_FAILURE_LIMIT: "8" }).limit, 8);
});

test("client IP comes from X-Real-IP, not the first forwarded hop", () => {
  const headers = new Headers({
    "x-forwarded-for": "198.51.100.20, 203.0.113.5",
    "x-real-ip": "203.0.113.5",
  });
  assert.equal(clientIp(headers), "203.0.113.5");
  assert.equal(clientIp(new Headers({ "x-forwarded-for": "198.51.100.20" })), "unknown");
});

test("a non-numeric or huge event year is not a database query", () => {
  assert.equal(parseEventRoute("altai-100", "2026")?.year, 2026);
  assert.equal(parseEventRoute("altai-100", "abc"), null);
  assert.equal(parseEventRoute("altai-100", "0988"), null);
  assert.equal(parseEventRoute("altai-100", "-2026"), null);
  assert.equal(parseEventRoute("altai-100", "2026.5"), null);
  assert.equal(parseEventRoute("altai-100", "99999"), null);
  assert.equal(parseEventRoute("a".repeat(2000), "2026"), null);
  assert.equal(acceptEventLookup("altai-100", Number.NaN), null);
  assert.equal(acceptEventLookup("altai-100", Number.POSITIVE_INFINITY), null);
});

test("city keeps real place names and rejects markup", () => {
  const city = parseCity("Усть-Каменогорск");
  assert.equal(city.ok, true);
  if (city.ok) assert.equal(city.city, "Усть-Каменогорск");
  assert.equal(parseCity("O'Fallon").ok, true);
  assert.equal(parseCity("<script>alert(1)</script>").ok, false);
  assert.equal(parseCity("Риддер\n<script>").ok, false);
  assert.equal(parsePersonName("Anna"), "Anna");
  assert.equal(parsePersonName("<b>Ann</b>"), null);
});

test("birth date rejects year 0988, the future, and impossible days", () => {
  const now = new Date("2026-10-30T00:00:00Z");
  assert.equal(parseBirthDate("0988-01-01", now), null);
  assert.equal(parseBirthDate("2027-01-01", now), null);
  assert.equal(parseBirthDate("2026-02-31", now), null);
  assert.ok(parseBirthDate("1990-05-04", now));
});

test("phone can be set and then cleared, while a missing field stays untouched", () => {
  assert.equal(optionalProfileText(null), undefined);
  assert.deepEqual(parsePhone(optionalProfileText("")), { ok: true, phone: null });
  assert.deepEqual(parsePhone(optionalProfileText("+7 705 000 00 00")), { ok: true, phone: "+7 705 000 00 00" });
  assert.equal(parsePhone("<script>").ok, false);
});

test("another user cannot act on a registration, and a foreign distance is rejected", () => {
  assert.equal(ownsRegistration(null, "owner"), false);
  assert.equal(ownsRegistration("stranger", "owner"), false);
  assert.equal(ownsRegistration("owner", "owner"), true);
  assert.equal(distanceBelongsToEvent({ eventId: "event-a" }, "event-b"), false);
  assert.equal(distanceBelongsToEvent(null, "event-b"), false);
  assert.equal(distanceBelongsToEvent({ eventId: "event-b" }, "event-b"), true);
});

test("a client amount does not change the invoice, and a missing payment does not mark it paid", () => {
  const amount = registrationPaymentAmount({
    isTransferOnly: false,
    discountAmount: 0,
    includesTransfer: false,
    distance: { price: 15000 },
    event: { transferPrice: 5000 },
  });
  assert.equal(amount, 15000);
  assert.equal(
    decidePaymentTransition({ status: "RESERVED", expectedAmount: amount, paidAmount: 1 }),
    "amount_mismatch",
  );
  assert.equal(
    decidePaymentTransition({ status: "RESERVED", expectedAmount: amount }),
    "amount_mismatch",
  );
  assert.equal(
    decidePaymentTransition({ status: "RESERVED", expectedAmount: 0 }),
    "amount_mismatch",
  );
  assert.equal(
    decidePaymentTransition({ status: "RESERVED", expectedAmount: 0, complimentary: true }),
    "pay",
  );
  assert.equal(
    decidePaymentTransition({ status: "RESERVED", expectedAmount: amount, complimentary: true, paidAmount: 1 }),
    "amount_mismatch",
  );
});

test("spreadsheet cells cannot start a formula", () => {
  assert.equal(csvSafeCell("=cmd()"), "'=cmd()");
  assert.equal(csvSafeCell("+7705"), "'+7705");
  assert.equal(csvSafeCell("@sum"), "'@sum");
  assert.equal(toCsv([["=1+1", "Риддер"]]).includes("'=1+1"), true);
  assert.equal(toCsv([["<script>alert(1)</script>"]]).includes("<script>alert(1)</script>"), true);
});

test("CSP and the static security headers are present and do not allow eval", () => {
  const policy = contentSecurityPolicy({ nonce: "abc", upgradeInsecureRequests: false, env: {} });
  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /script-src 'self' 'nonce-abc'/);
  assert.match(policy, /object-src 'none'/);
  assert.match(policy, /base-uri 'self'/);
  assert.match(policy, /frame-ancestors 'self'/);
  assert.equal(policy.includes("unsafe-eval"), false);
  assert.equal(policy.includes("script-src 'self' 'unsafe-inline'"), false);
  assert.equal(cspResponseHeaderName({ CSP_ENFORCE: "true" }), "Content-Security-Policy");
  assert.equal(cspResponseHeaderName({}), "Content-Security-Policy-Report-Only");
  const names = new Set(securityHeaders.map((header) => header.key));
  for (const name of [
    "X-Content-Type-Options",
    "Referrer-Policy",
    "Strict-Transport-Security",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
    "X-Frame-Options",
    "Permissions-Policy",
  ]) {
    assert.equal(names.has(name), true);
  }
  assert.equal(securityHeaders.find((header) => header.key === "Cross-Origin-Opener-Policy")?.value, "same-origin-allow-popups");
});
