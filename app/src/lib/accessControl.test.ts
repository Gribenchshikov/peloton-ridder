import assert from "node:assert/strict";
import { test } from "node:test";
import { canClaimVolunteerReward, volunteerThreshold } from "./volunteerReward";
import { rateLimit, resetRateLimits } from "./rateLimit";
import { kitScanToken, registrationIdFromKitScanToken } from "./ticketCode";
import { scannerCanAccessEvent, type ScannerAccess } from "./kitPickup";

const secret = "test-scan-secret-value";

test("a client-supplied threshold of zero does not unlock the volunteer reward", () => {
  assert.equal(volunteerThreshold("0"), 3);
  assert.equal(
    canClaimVolunteerReward({ isVolunteer: true, alreadyClaimed: false, credited: 0, threshold: volunteerThreshold("0") }),
    "not_reached",
  );
  assert.equal(
    canClaimVolunteerReward({ isVolunteer: false, alreadyClaimed: false, credited: 5, threshold: 3 }),
    "not_volunteer",
  );
  assert.equal(
    canClaimVolunteerReward({ isVolunteer: true, alreadyClaimed: false, credited: 3, threshold: 3 }),
    "ok",
  );
});

test("login and reset limits stop further work without changing the caller-facing result shape", () => {
  resetRateLimits();
  for (let i = 0; i < 10; i += 1) assert.equal(rateLimit("login:test", 10, 60_000, 1_000), true);
  assert.equal(rateLimit("login:test", 10, 60_000, 1_000), false);
  assert.equal(rateLimit("reset:test", 5, 60_000, 2_000), true);
});

test("an unsigned registration id is not a valid kit QR", () => {
  const token = kitScanToken("reg-1", secret);
  assert.equal(registrationIdFromKitScanToken(token, secret), "reg-1");
  assert.equal(registrationIdFromKitScanToken("RIDDER:reg-1", secret), null);
  assert.equal(registrationIdFromKitScanToken(token.slice(0, -1) + "a", secret), null);
  assert.equal(registrationIdFromKitScanToken(kitScanToken("reg-2", secret).replace("reg-2", "reg-1"), secret), null);
});

test("a volunteer cannot open another event", () => {
  const volunteer: Extract<ScannerAccess, { ok: true }> = {
    ok: true,
    userId: "vol",
    scope: "events",
    eventIds: ["event-a"],
  };
  const staff: Extract<ScannerAccess, { ok: true }> = { ok: true, userId: "op", scope: "all" };
  assert.equal(scannerCanAccessEvent(volunteer, "event-a"), true);
  assert.equal(scannerCanAccessEvent(volunteer, "event-b"), false);
  assert.equal(scannerCanAccessEvent(staff, "event-b"), true);
});
