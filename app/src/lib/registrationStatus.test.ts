import assert from "node:assert/strict";
import { test } from "node:test";
import { canBoardTransfer, transferPassengerBadge } from "./registrationStatus";

const keptTransfer = {
  status: "PAID",
  includesTransfer: true,
  isTransferOnly: true,
  refundRequests: [
    { type: "SLOT", status: "CONFIRMED" },
    { type: "TRANSFER", status: "CONFIRMED" },
  ],
};

test("a kept transfer stays paid after a slot refund on the same invoice", () => {
  assert.equal(canBoardTransfer(keptTransfer), true);
  assert.equal(
    transferPassengerBadge({ ...keptTransfer, paymentStatus: "paid", isCurrent: true }),
    "paid",
  );
});

test("a refunded transfer shows as refunded and cannot be boarded", () => {
  const refunded = {
    status: "CANCELLED",
    includesTransfer: false,
    isTransferOnly: true,
    refundRequests: [{ type: "TRANSFER", status: "CONFIRMED" }],
  };
  assert.equal(canBoardTransfer(refunded), false);
  assert.equal(
    transferPassengerBadge({ ...refunded, paymentStatus: "cancelled", isCurrent: true }),
    "refunded",
  );
});

test("an in-flight transfer refund stays pending while boarding is still allowed", () => {
  const pending = {
    status: "PAID",
    includesTransfer: true,
    isTransferOnly: false,
    refundRequests: [{ type: "TRANSFER", status: "PENDING" }],
  };
  assert.equal(
    transferPassengerBadge({ ...pending, paymentStatus: "paid", isCurrent: true }),
    "pending",
  );
});
