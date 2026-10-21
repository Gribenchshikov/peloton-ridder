import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decidePaymentTransition,
  kaspiQrImageUrl,
  paymentModeMatches,
  providerSimulationAllowed,
  serverUsesSandbox,
  showPaymentSimulation,
  simulationGate,
  verifyRefundMatch,
  type PaymentEnv,
} from "./apipayPayment";
import {
  apipayWebhookSignature,
  processApipayWebhook,
  type ApipayWebhookDeps,
  type PaidRegistration,
  type StoredRefund,
  type TrustedInvoice,
} from "./apipayWebhook";

const production: PaymentEnv = {
  NODE_ENV: "production",
  ALLOW_TEST_PAYMENTS: "true",
  APIPAY_API_KEY: "live-key",
};

test("production never allows payment simulation, even with the test flag and an API key", () => {
  assert.equal(simulationGate(production), "forbidden");
  assert.equal(providerSimulationAllowed(production, true), false);
  assert.equal(showPaymentSimulation(true, production), false);
});

test("sandbox simulation needs the server flag and a sandbox invoice, not a request parameter", () => {
  const sandbox: PaymentEnv = { ...production, APIPAY_SANDBOX: "true" };
  assert.equal(simulationGate(sandbox), "provider_sandbox");
  assert.equal(providerSimulationAllowed(sandbox, false), false);
  assert.equal(providerSimulationAllowed(sandbox, true), true);
  assert.equal(showPaymentSimulation(false, sandbox), false);
  assert.equal(showPaymentSimulation(null, sandbox), true);
  assert.equal(showPaymentSimulation(true, sandbox), true);
  assert.equal(simulationGate({ ...sandbox, ALLOW_TEST_PAYMENTS: "false" }), "forbidden");
});

test("a sandbox invoice is not accepted by a production server", () => {
  assert.equal(serverUsesSandbox(production), false);
  assert.equal(paymentModeMatches(false, false), true);
  assert.equal(paymentModeMatches(false, true), false);
  assert.equal(paymentModeMatches(true, false), false);
  assert.equal(paymentModeMatches(true, true), true);
  assert.equal(paymentModeMatches(false, undefined), false);
});

test("local stub does not call the provider and stays closed in production", () => {
  assert.equal(
    simulationGate({ NODE_ENV: "development", ALLOW_TEST_PAYMENTS: "true" }),
    "local_stub",
  );
  assert.equal(
    simulationGate({ NODE_ENV: "production", ALLOW_TEST_PAYMENTS: "true" }),
    "forbidden",
  );
});

test("Kaspi QR image comes from qr_image_url or the storage path returned on invoice read", () => {
  assert.equal(
    kaspiQrImageUrl({ qr_image_url: "https://cdn.example/qr.png", qr_image_path: "qr/ignored.png" }),
    "https://cdn.example/qr.png",
  );
  assert.equal(
    kaspiQrImageUrl({ qr_image_path: "qr/d84dea0e-de68-4f32-bb15-7b686b56c264.png" }),
    "https://api.apipay.kz/storage/qr/d84dea0e-de68-4f32-bb15-7b686b56c264.png",
  );
  assert.equal(
    kaspiQrImageUrl(
      { qr_image_path: "/storage/qr/already.png" },
      "https://sandbox.apipay.kz/api/v1",
    ),
    "https://sandbox.apipay.kz/storage/qr/already.png",
  );
  assert.equal(kaspiQrImageUrl({ qr_image_url: "  ", qr_image_path: "  " }), null);
});

test("paid amount must match the server order before PAID", () => {
  assert.equal(
    decidePaymentTransition({ status: "RESERVED", expectedAmount: 15000, paidAmount: "15000.00" }),
    "pay",
  );
  assert.equal(
    decidePaymentTransition({ status: "RESERVED", expectedAmount: 15000, paidAmount: 1 }),
    "amount_mismatch",
  );
  assert.equal(
    decidePaymentTransition({ status: "RESERVED", expectedAmount: 15000, paidAmount: "15000", currency: "USD" }),
    "currency_mismatch",
  );
  assert.equal(
    decidePaymentTransition({
      status: "RESERVED",
      expectedAmount: 15000,
      paidAmount: 15000,
      currentInvoiceId: "10",
      paidInvoiceId: "11",
    }),
    "invoice_mismatch",
  );
});

test("a repeated paid decision does not pay twice and a cancelled registration stays closed", () => {
  assert.equal(
    decidePaymentTransition({ status: "PAID", expectedAmount: 15000, paidAmount: 15000 }),
    "replay",
  );
  assert.equal(
    decidePaymentTransition({ status: "CANCELLED", expectedAmount: 15000, paidAmount: 15000 }),
    "ignore",
  );
  assert.equal(
    decidePaymentTransition({ status: "PAID", expectedAmount: 15000, paidAmount: 1000 }),
    "amount_mismatch",
  );
});

test("a refund is applied only when id, invoice, amount, currency and status match", () => {
  const local = {
    apipayRefundId: "9",
    invoiceId: "4",
    amount: 7000,
    payoutStatus: "pending",
    status: "PENDING",
    registrationStatus: "PAID",
  };
  const trusted = { id: 9, invoice_id: 4, amount: "7000.00", currency: "KZT", status: "completed" };
  assert.equal(
    verifyRefundMatch({ invoiceId: "4", refundId: "9", trusted: { ...trusted, status: "processing" }, local }),
    "reject",
  );
  assert.equal(verifyRefundMatch({ invoiceId: "4", refundId: "9", trusted, local }), "apply");
  assert.equal(
    verifyRefundMatch({ invoiceId: "4", refundId: "9", trusted: { ...trusted, id: 8 }, local }),
    "reject",
  );
  assert.equal(verifyRefundMatch({ invoiceId: "4", refundId: "9", trusted, local: null }), "reject");
  assert.equal(
    verifyRefundMatch({ invoiceId: "4", refundId: "9", trusted: { ...trusted, amount: "1" }, local }),
    "reject",
  );
  assert.equal(
    verifyRefundMatch({ invoiceId: "4", refundId: "9", trusted: { ...trusted, currency: "USD" }, local }),
    "reject",
  );
  assert.equal(
    verifyRefundMatch({
      invoiceId: "4",
      refundId: "9",
      trusted,
      local: { ...local, payoutStatus: "completed", status: "CONFIRMED" },
    }),
    "replay",
  );
});

const secret = "webhook-test-secret";

function signed(body: string) {
  return { rawBody: body, signature: apipayWebhookSignature(body, secret), secret, sandbox: false };
}

function eventBody(
  event: string,
  invoice: Record<string, unknown> | undefined,
  extra: Record<string, unknown> = {},
) {
  return JSON.stringify({ event, is_sandbox: false, ...(invoice ? { invoice } : {}), ...extra });
}

function harness(seed?: { registration?: PaidRegistration | null; refund?: StoredRefund | null }) {
  const calls = { confirm: 0, apply: 0, refundLookup: 0 };
  let registration = seed?.registration === undefined ? paidRegistration() : seed.registration;
  let refund = seed?.refund ?? null;
  const deps: ApipayWebhookDeps = {
    getInvoice: async (invoiceId) => ({
      id: invoiceId,
      amount: "15000",
      status: "paid",
      currency: "KZT",
      external_order_id: "reg-1",
      is_sandbox: false,
    }),
    getRefund: async () => {
      calls.refundLookup += 1;
      return { id: 9, invoice_id: 4, amount: "7000", currency: "KZT", status: "completed" };
    },
    findRegistration: async () => registration,
    confirmPaid: async () => {
      calls.confirm += 1;
      if (registration) registration = { ...registration, status: "PAID" };
    },
    findLocalRefund: async () => refund,
    applyRefund: async () => {
      calls.apply += 1;
      if (refund) refund = { ...refund, payoutStatus: "completed", status: "CONFIRMED" };
      return "applied";
    },
  };
  return { calls, deps, setInvoice: (invoice: TrustedInvoice) => {
    deps.getInvoice = async () => invoice;
  }, setRefund: (next: StoredRefund | null) => {
    refund = next;
  } };
}

function paidRegistration(): PaidRegistration {
  return { id: "reg-1", status: "RESERVED", expectedAmount: 15000, kaspiOrderId: "4" };
}

test("webhook without a secret is rejected and does not confirm a payment", async () => {
  const { calls, deps } = harness();
  const body = eventBody("invoice.status_changed", { id: 4, status: "paid", external_order_id: "reg-1", amount: "15000.00" });
  const result = await processApipayWebhook({ rawBody: body, signature: null, secret: "  ", sandbox: false, deps });
  assert.equal(result.status, 401);
  assert.equal(result.body.error, "missing_secret");
  assert.equal(calls.confirm, 0);
});

test("a forged webhook signature is rejected", async () => {
  const { calls, deps } = harness();
  const body = eventBody("invoice.status_changed", { id: 4, status: "paid" });
  const result = await processApipayWebhook({
    rawBody: body,
    signature: apipayWebhookSignature(body, "other-secret"),
    secret,
    sandbox: false,
    deps,
  });
  assert.equal(result.status, 401);
  assert.equal(calls.confirm, 0);
  assert.equal(calls.apply, 0);
});

test("pending and cancelled invoice events do not confirm a payment", async () => {
  const { calls, deps } = harness();
  deps.getInvoice = async () => {
    throw new Error("provider must not be called");
  };
  for (const status of ["pending", "cancelled"]) {
    const body = eventBody("invoice.status_changed", { id: 4, status, external_order_id: "reg-1", amount: "15000.00" });
    const result = await processApipayWebhook({ ...signed(body), deps });
    assert.equal(result.status, 200);
    assert.equal(result.body.ignored, true);
  }
  assert.equal(calls.confirm, 0);
});

test("a signed webhook with the wrong amount does not mark the order paid", async () => {
  const { calls, deps } = harness();
  deps.getInvoice = async () => ({
    id: 4,
    amount: "1",
    status: "paid",
    currency: "KZT",
    external_order_id: "reg-1",
    is_sandbox: false,
  });
  const body = eventBody("invoice.status_changed", { id: 4, status: "paid", amount: "15000.00", external_order_id: "reg-1" });
  const result = await processApipayWebhook({ ...signed(body), deps });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, "amount_mismatch");
  assert.equal(calls.confirm, 0);
});

test("a provider invoice that is still pending is not confirmed and can be retried", async () => {
  const { calls, deps } = harness();
  deps.getInvoice = async () => ({
    id: 4,
    amount: "15000",
    status: "pending",
    external_order_id: "reg-1",
    is_sandbox: false,
  });
  const body = eventBody("invoice.status_changed", { id: 4, status: "paid", external_order_id: "reg-1", amount: "15000.00" });
  const result = await processApipayWebhook({ ...signed(body), deps });
  assert.equal(result.status, 503);
  assert.equal(result.body.error, "not_paid");
  assert.equal(calls.confirm, 0);
});

test("a provider invoice that is cancelled is not confirmed", async () => {
  const { calls, deps } = harness();
  deps.getInvoice = async () => ({
    id: 4,
    amount: "15000",
    status: "cancelled",
    external_order_id: "reg-1",
    is_sandbox: false,
  });
  const body = eventBody("invoice.status_changed", { id: 4, status: "paid", external_order_id: "reg-1", amount: "15000.00" });
  const result = await processApipayWebhook({ ...signed(body), deps });
  assert.equal(result.status, 200);
  assert.equal(result.body.ignored, "cancelled");
  assert.equal(calls.confirm, 0);
});

test("a production server ignores a sandbox payment webhook", async () => {
  const { calls, deps } = harness();
  deps.getInvoice = async () => {
    throw new Error("provider must not be called");
  };
  const body = JSON.stringify({
    event: "invoice.status_changed",
    is_sandbox: true,
    invoice: { id: 4, status: "paid", external_order_id: "reg-1", amount: "15000.00" },
  });
  const result = await processApipayWebhook({ ...signed(body), deps });
  assert.equal(result.status, 200);
  assert.equal(result.body.ignored, "sandbox_mode");
  assert.equal(calls.confirm, 0);
});

test("a repeated paid webhook confirms once", async () => {
  const { calls, deps } = harness();
  const body = eventBody("invoice.status_changed", {
    id: 4,
    status: "paid",
    external_order_id: "reg-1",
    amount: "15000.00",
  });
  const first = await processApipayWebhook({ ...signed(body), deps });
  const second = await processApipayWebhook({ ...signed(body), deps });
  assert.equal(first.status, 200);
  assert.equal(first.body.ok, true);
  assert.equal(second.status, 200);
  assert.equal(second.body.replay, true);
  assert.equal(calls.confirm, 1);
});

test("a refund webhook with a foreign id does not change local state", async () => {
  const { calls, deps } = harness({ registration: null, refund: null });
  const body = eventBody("invoice.refunded", { id: 4 }, { refund: { id: 9, status: "completed" } });
  const result = await processApipayWebhook({ ...signed(body), deps });
  assert.equal(result.status, 409);
  assert.equal(result.body.error, "refund_mismatch");
  assert.equal(calls.apply, 0);
  assert.equal(calls.confirm, 0);
});

test("a repeated refund webhook applies once", async () => {
  const { calls, deps } = harness({
    registration: null,
    refund: {
      id: "local-1",
      apipayRefundId: "9",
      invoiceId: "4",
      amount: 7000,
      payoutStatus: "pending",
      status: "PENDING",
      registrationStatus: "PAID",
    },
  });
  const body = eventBody("invoice.refunded", { id: 4 }, { refund: { id: 9, status: "completed", amount: 1 } });
  const first = await processApipayWebhook({ ...signed(body), deps });
  const second = await processApipayWebhook({ ...signed(body), deps });
  assert.equal(first.status, 200);
  assert.equal(first.body.replay, undefined);
  assert.equal(second.status, 200);
  assert.equal(second.body.replay, true);
  assert.equal(calls.apply, 1);
});

test("a trusted refund that does not match the paid amount is rejected", async () => {
  const { calls, deps } = harness({
    registration: null,
    refund: {
      id: "local-1",
      apipayRefundId: "9",
      invoiceId: "4",
      amount: 7000,
      payoutStatus: "pending",
      status: "PENDING",
      registrationStatus: "PAID",
    },
  });
  deps.getRefund = async () => ({ id: 9, invoice_id: 4, amount: "100", currency: "KZT", status: "completed" });
  const body = eventBody("invoice.refunded", { id: 4 }, { refund: { id: 9, status: "completed" } });
  const result = await processApipayWebhook({ ...signed(body), deps });
  assert.equal(result.status, 409);
  assert.equal(calls.apply, 0);
});
