import { prisma } from "@/lib/prisma";
import { confirmPayment } from "@/lib/kaspi";
import { collectPaidInvoices, parsePaidInvoiceAt } from "@/lib/invoiceDisplay";
import { registrationPaymentAmount, type PayableRegistration } from "@/lib/paymentAmount";
import {
  currencyAccepted,
  kaspiQrImageUrl,
  moneyMatches,
  paymentModeMatches,
  PaymentVerificationError,
  providerSimulationAllowed,
  serverUsesSandbox,
  simulationGate,
} from "@/lib/apipayPayment";

const BASE = (process.env.APIPAY_BASE_URL ?? "https://api.apipay.kz/api/v1").replace(/\/$/, "");

export function isApipayConfigured() {
  return Boolean(process.env.APIPAY_API_KEY);
}

export function invoicePaidAt(invoice: { paid_at?: string | null }): Date | undefined {
  if (!invoice.paid_at) return undefined;
  const date = new Date(invoice.paid_at);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export type ApipayInvoice = {
  id: number;
  amount?: string;
  status: string;
  qr_token_url?: string | null;
  qr_image_url?: string | null;
  qr_image_path?: string | null;
  qr_expires_at?: string | null;
  is_sandbox?: boolean;
  is_qr_token?: boolean;
  external_order_id?: string | null;
  is_fully_refunded?: boolean;
  available_for_refund?: number | string;
  total_refunded?: string;
  paid_at?: string | null;
  created_at?: string | null;
  currency?: string | null;
  error?: string;
  error_code?: string;
  error_message?: string;
};

export type PaymentInvoiceView = {
  amount: number;
  invoiceId: string | null;
  paymentUrl: string | null;
  qrImageUrl: string | null;
  expiresAt: string | null;
  sandbox: boolean | null;
  error: string | null;
};

type ApipayError = Error & { status?: number; code?: string };

function apipayLog(event: string, extra: Record<string, unknown>) {
  console.info("[apipay]", { event, ...extra });
}

function invoiceRefundable(invoice: ApipayInvoice) {
  if (invoice.is_fully_refunded) return false;
  return invoice.status === "paid" || invoice.status === "partially_refunded";
}

async function apipay<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.APIPAY_API_KEY;
  if (!key) throw new Error("APIPAY_API_KEY is not set");

  const method = (init?.method ?? "GET").toUpperCase();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    error?: string;
    error_code?: string;
    error_message?: string;
    refund?: { id?: number; status?: string };
    invoice?: { id?: number };
  };
  if (!res.ok) {
    apipayLog("http_error", {
      method,
      path,
      httpStatus: res.status,
      errorCode: data.error_code ?? data.error ?? null,
      invoiceId: data.invoice?.id ?? null,
      refundId: data.refund?.id ?? null,
    });
    const err: ApipayError = new Error(data.error_message || data.error_code || data.error || `ApiPay HTTP ${res.status}`);
    err.status = res.status;
    err.code = data.error_code || data.error;
    throw err;
  }
  return data as T;
}

export function getInvoice(id: string | number) {
  return apipay<ApipayInvoice>(`/invoices/${id}`);
}

export async function simulateInvoicePaid(id: string | number) {
  if (simulationGate(process.env) !== "provider_sandbox") {
    throw new PaymentVerificationError("simulation_forbidden");
  }
  const current = await getInvoice(id);
  if (!providerSimulationAllowed(process.env, current.is_sandbox === true)) {
    throw new PaymentVerificationError("simulation_forbidden");
  }
  return apipay<ApipayInvoice>(`/invoices/${id}/simulate-status`, {
    method: "POST",
    body: JSON.stringify({ status: "paid" }),
  });
}

export type ApipayRefund = {
  id: number;
  amount?: string;
  status: string;
  invoice_id?: number;
  currency?: string | null;
  error_code?: string;
  error_message?: string;
};

type RefundCreateResponse = {
  id?: number;
  status?: string;
  message?: string;
  refund?: ApipayRefund | string | null;
  invoice?: { id?: number };
  error_code?: string;
  error_message?: string;
};

export function refundIdOf(id: number | string | null | undefined) {
  if (id == null || id === 0 || id === "0" || id === "undefined") return null;
  return String(id);
}

function asRefund(data: RefundCreateResponse): ApipayRefund | null {
  if (data.refund && typeof data.refund === "object" && data.refund.id != null) {
    return data.refund;
  }
  if (data.id != null && data.refund == null) {
    return { id: data.id, status: data.status ?? "pending" };
  }
  return null;
}

export function invoiceRefundRows(list: { data?: ApipayRefund[]; refunds?: ApipayRefund[] } | null | undefined) {
  return list?.refunds ?? list?.data ?? [];
}

function isRefundConflict(error: unknown) {
  const err = error as ApipayError;
  if (err.status === 409) return true;
  const code = String(err.code ?? "").toLowerCase();
  return err.status === 422 && /already|in_progress|pending_refund|duplicate/.test(code);
}

/** Полный возврат — без amount; частичный — с суммой в тенге. */
export async function refundInvoice(invoiceId: string | number, amount?: number, reason?: string) {
  const body: Record<string, unknown> = {};
  if (amount != null) body.amount = amount;
  if (reason) body.reason = reason.slice(0, 500);

  try {
    const data = await apipay<RefundCreateResponse>(`/invoices/${invoiceId}/refund`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const refund = asRefund(data);
    if (!refundIdOf(refund?.id)) {
      apipayLog("refund_missing_id", { invoiceId, httpStatus: 201 });
      throw Object.assign(new Error("ApiPay refund response missing refund id"), {
        status: 201,
        code: "missing_refund_id",
      });
    }
    apipayLog("refund_accepted", {
      invoiceId,
      refundId: refund!.id,
      refundStatus: refund!.status,
      amount: amount ?? "full",
    });
    return refund!;
  } catch (error) {
    if (isRefundConflict(error)) {
      const rows = invoiceRefundRows(await listInvoiceRefunds(invoiceId)).filter((row) => refundIdOf(row.id));
      const matched = rows.filter((row) => {
        if (!currencyAccepted(row.currency)) return false;
        if (amount == null) return true;
        return moneyMatches(row.amount, amount);
      });
      if (matched.length === 1 && matched[0]) {
        apipayLog("refund_conflict_reused", { invoiceId, refundId: matched[0].id, refundStatus: matched[0].status });
        return matched[0];
      }
    }
    apipayLog("refund_failed", {
      invoiceId,
      amount: amount ?? "full",
      httpStatus: (error as ApipayError).status ?? null,
      errorCode: (error as ApipayError).code ?? null,
    });
    throw error;
  }
}

export async function getInvoiceRefund(invoiceId: string | number, refundId: string | number) {
  const wanted = refundIdOf(refundId);
  if (!wanted) return null;
  const rows = invoiceRefundRows(await listInvoiceRefunds(invoiceId));
  return rows.find((row) => refundIdOf(row.id) === wanted) ?? null;
}

export async function listInvoiceRefunds(invoiceId: string | number) {
  const list = await apipay<{ data?: ApipayRefund[]; refunds?: ApipayRefund[] }>(`/invoices/${invoiceId}/refunds`);
  apipayLog("refunds_listed", { invoiceId, count: invoiceRefundRows(list).length });
  return list;
}

export function invoiceAvailableForRefund(invoice: ApipayInvoice): number {
  if (invoice.is_fully_refunded) return 0;
  const raw = invoice.available_for_refund;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) return Math.max(0, Math.floor(parsed));
  }
  return Number.POSITIVE_INFINITY;
}

export async function findPaidInvoiceForOrder(
  externalOrderId: string,
  knownId?: string | null,
): Promise<ApipayInvoice | null> {
  if (knownId) {
    try {
      const invoice = await getInvoice(knownId);
      if (invoiceRefundable(invoice)) return invoice;
      apipayLog("invoice_not_refundable", {
        invoiceId: invoice.id,
        status: invoice.status,
        isFullyRefunded: Boolean(invoice.is_fully_refunded),
        externalOrderId,
      });
    } catch (error) {
      apipayLog("get_invoice_failed", {
        invoiceId: knownId,
        httpStatus: (error as ApipayError).status ?? null,
        errorCode: (error as ApipayError).code ?? null,
      });
    }
  }

  const params = new URLSearchParams();
  params.set("search", externalOrderId);
  params.set("per_page", "50");
  try {
    const list = await apipay<{ data?: ApipayInvoice[] }>(`/invoices?${params.toString()}`);
    const rows = list.data ?? [];
    const paid = rows.filter(
      (row) =>
        (row.external_order_id === externalOrderId || !row.external_order_id) &&
        invoiceRefundable(row),
    );
    const match = paid.find((row) => row.external_order_id === externalOrderId) ?? paid[0] ?? null;
    if (!match) {
      apipayLog("paid_invoice_not_found", { externalOrderId, knownId: knownId ?? null, listed: rows.length });
    }
    return match;
  } catch (error) {
    apipayLog("list_invoices_failed", {
      externalOrderId,
      httpStatus: (error as ApipayError).status ?? null,
      errorCode: (error as ApipayError).code ?? null,
    });
    return null;
  }
}

function invoiceToView(invoice: ApipayInvoice, amount: number, error: string | null = null): PaymentInvoiceView {
  return {
    amount,
    invoiceId: String(invoice.id),
    paymentUrl: invoice.qr_token_url ?? null,
    qrImageUrl: kaspiQrImageUrl(invoice, BASE),
    expiresAt: invoice.qr_expires_at ?? null,
    sandbox: typeof invoice.is_sandbox === "boolean" ? invoice.is_sandbox : null,
    error,
  };
}

function withStoredQr(view: PaymentInvoiceView, registration: EnsureSource): PaymentInvoiceView {
  return {
    ...view,
    paymentUrl: view.paymentUrl ?? registration.kaspiPaymentUrl,
    qrImageUrl: view.qrImageUrl ?? registration.kaspiQrImageUrl,
    expiresAt: view.expiresAt ?? registration.kaspiQrExpiresAt?.toISOString() ?? null,
  };
}

function stillValid(expiresAt: Date | string | null | undefined) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() > 20_000;
}

function paymentPurpose(params: { isTransferOnly: boolean; includesTransfer: boolean }) {
  if (params.isTransferOnly) return "только трансфер";
  if (params.includesTransfer) return "слот+трансфер";
  return "слот";
}

function qrDescription(params: {
  raceName: string;
  year: number;
  firstName: string;
  lastName: string;
  isTransferOnly: boolean;
  includesTransfer: boolean;
}) {
  const purpose = paymentPurpose(params);
  const person = [params.lastName, params.firstName].map((part) => part.trim()).filter(Boolean).join(" ");
  const suffix = person ? ` · ${person} · ${purpose}` : ` · ${purpose}`;
  const race = `${params.raceName} ${params.year}`.trim();
  const racePart = race.slice(0, Math.max(0, 100 - suffix.length)).trimEnd();
  return `${racePart}${suffix}`.slice(0, 100);
}

export type ConfirmInvoiceResult = {
  invoice: ApipayInvoice;
  confirmed: boolean;
  error?: "amount_mismatch" | "currency_mismatch" | "invoice_mismatch" | "sandbox_mismatch" | "not_paid";
};

export async function confirmIfInvoicePaid(registrationId: string, invoiceId: string): Promise<ConfirmInvoiceResult> {
  const invoice = await getInvoice(invoiceId);
  if (invoice.status !== "paid") return { invoice, confirmed: false };
  if (!paymentModeMatches(serverUsesSandbox(process.env), invoice.is_sandbox)) {
    apipayLog("sandbox_mismatch", { invoiceId: invoice.id, sandbox: invoice.is_sandbox ?? null, registrationId });
    return { invoice, confirmed: false, error: "sandbox_mismatch" };
  }
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { distance: true, event: { select: { transferPrice: true } } },
  });
  if (!registration) return { invoice, confirmed: false };
  if (registration.status === "PAID") return { invoice, confirmed: true };
  if (registration.status !== "RESERVED") return { invoice, confirmed: false, error: "not_paid" };
  const problem = await settlePaidInvoice(registration, invoice);
  if (problem) return { invoice, confirmed: false, error: problem };
  return { invoice, confirmed: true };
}

export async function findRegistrationForInvoice(invoice: { id: number; external_order_id?: string | null }) {
  const invoiceId = String(invoice.id);
  const byCurrent = await prisma.registration.findFirst({
    where: { kaspiOrderId: invoiceId },
  });
  if (byCurrent) return byCurrent;
  // Счёт создан, но kaspiOrderId ещё не записался — ищем по external_order_id,
  // только среди текущей брони, чтобы старый оплаченный счёт не закрыл повторную.
  if (!invoice.external_order_id) return null;
  return prisma.registration.findFirst({
    where: {
      id: invoice.external_order_id,
      status: "RESERVED",
      OR: [{ kaspiOrderId: invoiceId }, { kaspiOrderId: null }],
    },
  });
}

export async function confirmPendingPaidInvoices(eventId?: string) {
  const rows = await prisma.registration.findMany({
    where: {
      status: "RESERVED",
      kaspiOrderId: { not: null },
      ...(eventId ? { eventId } : {}),
    },
    select: { id: true, kaspiOrderId: true },
  });
  let confirmed = 0;
  for (const row of rows) {
    if (!row.kaspiOrderId) continue;
    try {
      const result = await confirmIfInvoicePaid(row.id, row.kaspiOrderId);
      if (result.confirmed) confirmed += 1;
    } catch (error) {
      console.error("[apipay] reconcile paid invoice failed:", row.id, error);
    }
  }
  return confirmed;
}

export async function repairPaidInvoiceDates(opts?: { eventId?: string; userId?: string }) {
  if (!isApipayConfigured()) return 0;
  const rows = await prisma.registration.findMany({
    where: {
      ...(opts?.eventId ? { eventId: opts.eventId } : {}),
      ...(opts?.userId ? { userId: opts.userId } : {}),
    },
    select: {
      id: true,
      status: true,
      kaspiOrderId: true,
      paidInvoiceIds: true,
      paidInvoiceAt: true,
    },
  });
  let updated = 0;
  for (const row of rows) {
    const invoices = collectPaidInvoices(row);
    if (invoices.length === 0) continue;
    const map = parsePaidInvoiceAt(row.paidInvoiceAt);
    let changed = false;
    for (const item of invoices) {
      if (map[item.id]) continue;
      try {
        const invoice = await getInvoice(item.id);
        const paidAt = invoicePaidAt(invoice);
        if (!paidAt) continue;
        map[item.id] = paidAt.toISOString();
        changed = true;
      } catch (error) {
        console.error("[apipay] paid_at lookup failed:", item.id, error);
      }
    }
    if (!changed) continue;
    await prisma.registration.update({
      where: { id: row.id },
      data: { paidInvoiceAt: map },
    });
    updated += 1;
  }
  return updated;
}

type EnsureSource = {
  id: string;
  status: string;
  isTransferOnly: boolean;
  discountAmount: number;
  includesTransfer: boolean;
  kaspiOrderId: string | null;
  kaspiPaymentUrl: string | null;
  kaspiQrImageUrl: string | null;
  kaspiQrExpiresAt: Date | null;
  distance: { price: number; name: string } | null;
  event: { year: number; transferPrice: number | null; race: { name: string } };
  user?: { firstName: string; lastName: string } | null;
};

/** Показать уже созданный счёт, не создавая новый при открытии страницы. */
export async function peekQrInvoice(registration: EnsureSource): Promise<PaymentInvoiceView | null> {
  const amount = registrationPaymentAmount(registration);
  if (!registration.kaspiOrderId) return null;
  try {
    const existing = await getInvoice(registration.kaspiOrderId);
    if (existing.status === "paid" && registration.status === "RESERVED") {
      const problem = await settlePaidInvoice(registration, existing);
      if (problem) return withStoredQr(invoiceToView(existing, amount, problem), registration);
    }
    return withStoredQr(invoiceToView(existing, amount), registration);
  } catch (error) {
    console.error("[apipay] peek invoice failed:", error);
    return {
      amount,
      invoiceId: registration.kaspiOrderId,
      paymentUrl: registration.kaspiPaymentUrl,
      qrImageUrl: registration.kaspiQrImageUrl,
      expiresAt: registration.kaspiQrExpiresAt?.toISOString() ?? null,
      sandbox: false,
      error: null,
    };
  }
}

export async function ensureQrInvoice(registration: EnsureSource, forceNew = false): Promise<PaymentInvoiceView> {
  const amount = registrationPaymentAmount(registration);
  if (amount < 1) {
    if (registration.status === "RESERVED") {
      await confirmPayment(registration.id, undefined, undefined, undefined, undefined, { complimentary: true });
    }
    return { amount, invoiceId: null, paymentUrl: null, qrImageUrl: null, expiresAt: null, sandbox: false, error: null };
  }
  if (!isApipayConfigured()) {
    return { amount, invoiceId: null, paymentUrl: null, qrImageUrl: null, expiresAt: null, sandbox: false, error: null };
  }
  if (registration.status !== "RESERVED") {
    return {
      amount,
      invoiceId: registration.kaspiOrderId,
      paymentUrl: registration.kaspiPaymentUrl,
      qrImageUrl: registration.kaspiQrImageUrl,
      expiresAt: registration.kaspiQrExpiresAt?.toISOString() ?? null,
      sandbox: false,
      error: null,
    };
  }

  if (!forceNew && registration.kaspiOrderId) {
    try {
      const existing = await getInvoice(registration.kaspiOrderId);
      if (existing.status === "paid") {
        const problem = await settlePaidInvoice(registration, existing);
        return withStoredQr(invoiceToView(existing, amount, problem), registration);
      }
      if (
        existing.status !== "refunded" &&
        existing.status !== "partially_refunded" &&
        (existing.status === "pending" || existing.status === "processing") &&
        stillValid(existing.qr_expires_at)
      ) {
        await saveInvoice(registration.id, existing);
        return withStoredQr(invoiceToView(existing, amount), registration);
      }
    } catch (error) {
      console.error("[apipay] get invoice failed:", error);
    }
  }

  try {
    const created = await apipay<ApipayInvoice>("/invoices/qr", {
      method: "POST",
      body: JSON.stringify({
        amount,
        description: qrDescription({
          raceName: registration.event.race.name,
          year: registration.event.year,
          firstName: registration.user?.firstName ?? "",
          lastName: registration.user?.lastName ?? "",
          isTransferOnly: registration.isTransferOnly,
          includesTransfer: registration.includesTransfer,
        }),
        external_order_id: registration.id,
      }),
    });
    await saveInvoice(registration.id, created);
    const createdWithMode =
      typeof created.is_sandbox === "boolean" ? created : await getInvoice(created.id).catch(() => created);
    return invoiceToView({ ...created, is_sandbox: createdWithMode.is_sandbox }, amount);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[apipay] create QR invoice failed:", error);
    return {
      amount,
      invoiceId: registration.kaspiOrderId,
      paymentUrl: registration.kaspiPaymentUrl,
      qrImageUrl: registration.kaspiQrImageUrl,
      expiresAt: registration.kaspiQrExpiresAt?.toISOString() ?? null,
      sandbox: false,
      error: message,
    };
  }
}

async function settlePaidInvoice(
  registration: PayableRegistration & { id: string; status: string; kaspiOrderId: string | null },
  invoice: ApipayInvoice,
): Promise<"amount_mismatch" | "currency_mismatch" | "invoice_mismatch" | "sandbox_mismatch" | null> {
  if (invoice.status !== "paid" || registration.status !== "RESERVED") return null;
  if (!paymentModeMatches(serverUsesSandbox(process.env), invoice.is_sandbox)) {
    apipayLog("sandbox_mismatch", {
      registrationId: registration.id,
      invoiceId: invoice.id,
      sandbox: invoice.is_sandbox ?? null,
    });
    return "sandbox_mismatch";
  }
  if (invoice.external_order_id && invoice.external_order_id !== registration.id) return "invoice_mismatch";
  if (registration.kaspiOrderId && registration.kaspiOrderId !== String(invoice.id)) return "invoice_mismatch";
  if (!currencyAccepted(invoice.currency)) return "currency_mismatch";
  const expected = registrationPaymentAmount(registration);
  if (!moneyMatches(invoice.amount, expected)) {
    console.error("[apipay] paid amount mismatch", {
      registrationId: registration.id,
      invoiceId: invoice.id,
      expected,
      paid: invoice.amount ?? null,
    });
    return "amount_mismatch";
  }
  try {
    await confirmPayment(
      registration.id,
      undefined,
      String(invoice.id),
      Number(invoice.amount),
      invoicePaidAt(invoice),
      { currency: invoice.currency ?? null },
    );
    apipayLog("payment_confirmed", { registrationId: registration.id, invoiceId: invoice.id });
    return null;
  } catch (error) {
    if (error instanceof PaymentVerificationError) {
      if (
        error.code === "amount_mismatch" ||
        error.code === "currency_mismatch" ||
        error.code === "invoice_mismatch"
      ) {
        return error.code;
      }
    }
    throw error;
  }
}

async function saveInvoice(registrationId: string, invoice: ApipayInvoice) {
  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      kaspiOrderId: String(invoice.id),
      kaspiPaymentUrl: invoice.qr_token_url ?? null,
      kaspiQrImageUrl: kaspiQrImageUrl(invoice, BASE),
      kaspiQrExpiresAt: invoice.qr_expires_at ? new Date(invoice.qr_expires_at) : null,
    },
  });
}
