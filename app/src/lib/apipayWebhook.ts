import { createHmac, timingSafeEqual } from "node:crypto";
import {
  decidePaymentTransition,
  paymentModeMatches,
  PaymentVerificationError,
  verifyRefundMatch,
  type LocalRefundMatch,
  type TrustedRefund,
} from "@/lib/apipayPayment";

export type TrustedInvoice = {
  id: number | string;
  amount?: string | number | null;
  status: string;
  currency?: string | null;
  external_order_id?: string | null;
  paid_at?: string | null;
  is_sandbox?: boolean | null;
};

export type PaidRegistration = {
  id: string;
  status: string;
  expectedAmount: number;
  kaspiOrderId: string | null;
};

export type StoredRefund = LocalRefundMatch & { id: string };

export type ApipayWebhookDeps = {
  getInvoice: (invoiceId: string) => Promise<TrustedInvoice>;
  getRefund: (invoiceId: string, refundId: string) => Promise<TrustedRefund | null>;
  findRegistration: (invoice: TrustedInvoice) => Promise<PaidRegistration | null>;
  confirmPaid: (registrationId: string, invoice: TrustedInvoice) => Promise<void>;
  findLocalRefund: (refundId: string) => Promise<StoredRefund | null>;
  applyRefund: (refundRequestId: string) => Promise<"applied" | "replay" | "rejected">;
};

export function apipayWebhookSignature(rawBody: string, secret: string) {
  return "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyApipayWebhookSignature(rawBody: string, signature: string | null, secret: string) {
  const expected = apipayWebhookSignature(rawBody, secret);
  const got = Buffer.from(signature ?? "");
  const exp = Buffer.from(expected);
  if (got.length !== exp.length) return false;
  return timingSafeEqual(got, exp);
}

type WebhookBody = { status: number; body: Record<string, unknown> };

function json(status: number, body: Record<string, unknown>): WebhookBody {
  return { status, body };
}

function webhookLog(step: string, extra: Record<string, unknown>) {
  console.info("[apipay] webhook", { step, ...extra });
}

export async function processApipayWebhook(input: {
  rawBody: string;
  signature: string | null;
  secret: string | undefined;
  sandbox: boolean;
  deps: ApipayWebhookDeps;
}): Promise<WebhookBody> {
  webhookLog("received", {
    bytes: Buffer.byteLength(input.rawBody),
    signaturePresent: Boolean(input.signature),
  });
  const secret = input.secret?.trim();
  if (!secret) {
    webhookLog("signature_rejected", { reason: "missing_secret" });
    return json(401, { error: "missing_secret" });
  }
  if (!verifyApipayWebhookSignature(input.rawBody, input.signature, secret)) {
    webhookLog("signature_rejected", { reason: "invalid_signature" });
    return json(401, { error: "invalid_signature" });
  }

  let payload: {
    event?: string;
    is_sandbox?: boolean;
    invoice?: { id?: number | string; status?: string; external_order_id?: string | null };
    refund?: { id?: number | string | null; status?: string | null };
  };
  try {
    payload = JSON.parse(input.rawBody) as typeof payload;
  } catch {
    webhookLog("rejected", { reason: "invalid_json" });
    return json(400, { error: "invalid_json" });
  }

  const invoiceId = payload.invoice?.id == null ? null : String(payload.invoice.id);
  webhookLog("accepted", {
    event: payload.event ?? null,
    invoiceId,
    refundId: payload.refund?.id == null || payload.refund.id === "" ? null : String(payload.refund.id),
    isSandbox: typeof payload.is_sandbox === "boolean" ? payload.is_sandbox : null,
  });

  if (payload.event === "webhook.test") {
    webhookLog("ignored", { event: "webhook.test" });
    return json(200, { ok: true });
  }

  if (!paymentModeMatches(input.sandbox, payload.is_sandbox)) {
    webhookLog("ignored", { event: payload.event ?? null, invoiceId, reason: "sandbox_mode" });
    return json(200, { ok: true, ignored: "sandbox_mode" });
  }

  if (payload.event === "invoice.refunded") {
    return processRefundEvent(payload, input.deps);
  }

  const statusChanged = payload.event === "invoice.status_changed";
  const paidEvent =
    (statusChanged && payload.invoice?.status === "paid") || payload.event === "invoice.paid";
  if (!paidEvent || invoiceId == null) {
    webhookLog("ignored", {
      event: payload.event ?? null,
      invoiceId,
      invoiceStatus: payload.invoice?.status ?? null,
    });
    return json(200, { ok: true, ignored: true });
  }

  return processPaidEvent(invoiceId, input.sandbox, input.deps);
}

async function processPaidEvent(invoiceId: string, sandbox: boolean, deps: ApipayWebhookDeps): Promise<WebhookBody> {
  let invoice: TrustedInvoice;
  try {
    invoice = await deps.getInvoice(invoiceId);
  } catch (error) {
    console.error("[apipay] webhook invoice lookup failed:", invoiceId, error);
    return json(502, { error: "verification_failed" });
  }
  webhookLog("invoice_read", { invoiceId, providerStatus: invoice.status, isSandbox: invoice.is_sandbox ?? null });
  if (String(invoice.id) !== invoiceId) {
    webhookLog("rejected", { invoiceId, reason: "invoice_mismatch" });
    return json(409, { error: "invoice_mismatch" });
  }
  if (!paymentModeMatches(sandbox, invoice.is_sandbox)) {
    webhookLog("rejected", { invoiceId, reason: "sandbox_mismatch" });
    return json(409, { error: "sandbox_mismatch" });
  }
  if (invoice.status === "pending" || invoice.status === "processing") {
    webhookLog("retry", { invoiceId, providerStatus: invoice.status });
    return json(503, { error: "not_paid" });
  }
  if (invoice.status !== "paid") {
    webhookLog("ignored", { invoiceId, providerStatus: invoice.status });
    return json(200, { ok: true, ignored: invoice.status });
  }

  const registration = await deps.findRegistration(invoice);
  if (!registration) {
    webhookLog("ignored", { invoiceId, reason: "registration_not_found" });
    return json(200, { ok: true, ignored: "registration_not_found" });
  }
  if (invoice.external_order_id && invoice.external_order_id !== registration.id) {
    webhookLog("rejected", { invoiceId, registrationId: registration.id, reason: "invoice_mismatch" });
    return json(409, { error: "invoice_mismatch" });
  }

  const decision = decidePaymentTransition({
    status: registration.status,
    expectedAmount: registration.expectedAmount,
    paidAmount: invoice.amount,
    currentInvoiceId: registration.kaspiOrderId,
    paidInvoiceId: invoiceId,
    currency: invoice.currency,
  });
  if (
    decision === "amount_mismatch" ||
    decision === "currency_mismatch" ||
    decision === "invoice_mismatch" ||
    decision === "simulation_forbidden" ||
    decision === "not_paid"
  ) {
    webhookLog("rejected", { invoiceId, registrationId: registration.id, reason: decision });
    return json(409, { error: decision });
  }
  if (decision === "replay") {
    webhookLog("replay", { invoiceId, registrationId: registration.id });
    return json(200, { ok: true, replay: true });
  }
  if (decision === "ignore") {
    webhookLog("ignored", { invoiceId, registrationId: registration.id, reason: "status" });
    return json(200, { ok: true, ignored: "status" });
  }

  try {
    await deps.confirmPaid(registration.id, invoice);
  } catch (error) {
    if (error instanceof PaymentVerificationError) {
      webhookLog("rejected", { invoiceId, registrationId: registration.id, reason: error.code });
      return json(409, { error: error.code });
    }
    console.error("[apipay] webhook confirm failed:", invoiceId, error);
    return json(500, { error: "processing_failed" });
  }
  webhookLog("confirmed", { invoiceId, registrationId: registration.id });
  return json(200, { ok: true });
}

async function processRefundEvent(
  payload: {
    invoice?: { id?: number | string };
    refund?: { id?: number | string | null };
  },
  deps: ApipayWebhookDeps,
): Promise<WebhookBody> {
  if (payload.invoice?.id == null || payload.refund?.id == null || payload.refund.id === "") {
    return json(422, { error: "refund_mismatch" });
  }
  const invoiceId = String(payload.invoice.id);
  const refundId = String(payload.refund.id);

  let trusted: TrustedRefund | null;
  try {
    trusted = await deps.getRefund(invoiceId, refundId);
  } catch (error) {
    console.error("[apipay] webhook refund lookup failed:", { invoiceId, refundId, error });
    return json(502, { error: "verification_failed" });
  }

  const local = await deps.findLocalRefund(refundId);
  const verdict = verifyRefundMatch({
    invoiceId,
    refundId,
    trusted,
    local,
  });
  if (verdict === "reject") {
    console.error("[apipay] webhook refund rejected:", { invoiceId, refundId });
    return json(409, { error: "refund_mismatch" });
  }
  if (verdict === "replay") return json(200, { ok: true, replay: true });

  try {
    const applied = await deps.applyRefund(local!.id);
    if (applied === "rejected") return json(409, { error: "refund_mismatch" });
    if (applied === "replay") return json(200, { ok: true, replay: true });
  } catch (error) {
    console.error("[apipay] webhook refund apply failed:", { invoiceId, refundId, error });
    return json(500, { error: "processing_failed" });
  }
  return json(200, { ok: true });
}
