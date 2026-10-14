import { prisma } from "@/lib/prisma";
import { confirmPayment } from "@/lib/kaspi";
import { registrationPaymentAmount } from "@/lib/paymentAmount";

const BASE = (process.env.APIPAY_BASE_URL ?? "https://api.apipay.kz/api/v1").replace(/\/$/, "");

export function isApipayConfigured() {
  return Boolean(process.env.APIPAY_API_KEY);
}

export type ApipayInvoice = {
  id: number;
  amount?: string;
  status: string;
  qr_token_url?: string | null;
  qr_image_url?: string | null;
  qr_expires_at?: string | null;
  is_sandbox?: boolean;
  is_qr_token?: boolean;
  external_order_id?: string | null;
  is_fully_refunded?: boolean;
  available_for_refund?: number | string;
  total_refunded?: string;
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
  sandbox: boolean;
  error: string | null;
};

type ApipayError = Error & { status?: number; code?: string };

async function apipay<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.APIPAY_API_KEY;
  if (!key) throw new Error("APIPAY_API_KEY is not set");

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as ApipayInvoice & {
    error?: string;
    error_code?: string;
    error_message?: string;
  };
  if (!res.ok) {
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

export function simulateInvoicePaid(id: string | number) {
  return apipay<ApipayInvoice>(`/invoices/${id}/simulate-status`, {
    method: "POST",
    body: JSON.stringify({ status: "paid" }),
  });
}

export type ApipayRefund = {
  id: number;
  amount?: string;
  status: string;
  error_code?: string;
  error_message?: string;
};

type RefundCreateResponse = {
  id?: number;
  status?: string;
  refund?: ApipayRefund | string | null;
  invoice?: { id?: number };
  error_code?: string;
  error_message?: string;
};

function asRefund(data: RefundCreateResponse): ApipayRefund {
  if (data.refund && typeof data.refund === "object" && data.refund.id != null) {
    return data.refund;
  }
  if (data.id != null) {
    return { id: data.id, status: data.status ?? "pending" };
  }
  return { id: data.invoice?.id ?? 0, status: data.status ?? "pending" };
}

/** Полный возврат — без amount; частичный — с суммой в тенге. */
export async function refundInvoice(invoiceId: string | number, amount?: number) {
  const data = await apipay<RefundCreateResponse>(`/invoices/${invoiceId}/refund`, {
    method: "POST",
    body: JSON.stringify(amount != null ? { amount } : {}),
  });
  return asRefund(data);
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
      if (invoice.status === "paid" || invoice.status === "partially_refunded") return invoice;
    } catch (error) {
      console.error("[apipay] get invoice failed:", error);
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
        (row.status === "paid" || row.status === "partially_refunded") &&
        !row.is_fully_refunded,
    );
    return paid.find((row) => row.external_order_id === externalOrderId) ?? paid[0] ?? null;
  } catch (error) {
    console.error("[apipay] list invoices failed:", error);
    return null;
  }
}

function invoiceToView(invoice: ApipayInvoice, amount: number, error: string | null = null): PaymentInvoiceView {
  return {
    amount,
    invoiceId: String(invoice.id),
    paymentUrl: invoice.qr_token_url ?? null,
    qrImageUrl: invoice.qr_image_url ?? null,
    expiresAt: invoice.qr_expires_at ?? null,
    sandbox: Boolean(invoice.is_sandbox),
    error,
  };
}

function stillValid(expiresAt: Date | string | null | undefined) {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() > 20_000;
}

function qrDescription(params: {
  raceName: string;
  year: number;
  distanceName: string | null;
  isTransferOnly: boolean;
}) {
  const item = params.isTransferOnly ? "Трансфер" : (params.distanceName ?? "Слот");
  const text = `${params.raceName} ${params.year} · ${item}`;
  return text.slice(0, 100);
}

export async function confirmIfInvoicePaid(registrationId: string, invoiceId: string) {
  const invoice = await getInvoice(invoiceId);
  if (invoice.status === "paid") {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: { status: true, kaspiOrderId: true },
    });
    if (
      registration?.status === "RESERVED" &&
      (!registration.kaspiOrderId || registration.kaspiOrderId === invoiceId)
    ) {
      await confirmPayment(registrationId);
    }
  }
  return invoice;
}

export async function findRegistrationForInvoice(invoice: { id: number; external_order_id?: string | null }) {
  // Только текущий kaspiOrderId: после возврата тот же registration.id
  // не должен закрыться старым счётом при повторной брони.
  return prisma.registration.findFirst({
    where: { kaspiOrderId: String(invoice.id) },
  });
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
};

export async function ensureQrInvoice(registration: EnsureSource, forceNew = false): Promise<PaymentInvoiceView> {
  const amount = registrationPaymentAmount(registration);
  if (amount < 1) {
    if (registration.status === "RESERVED") await confirmPayment(registration.id);
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
        await confirmPayment(registration.id);
        return invoiceToView(existing, amount);
      }
      if (
        existing.status !== "refunded" &&
        existing.status !== "partially_refunded" &&
        (existing.status === "pending" || existing.status === "processing") &&
        stillValid(existing.qr_expires_at)
      ) {
        await saveInvoice(registration.id, existing);
        return invoiceToView(existing, amount);
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
          distanceName: registration.distance?.name ?? null,
          isTransferOnly: registration.isTransferOnly,
        }),
        external_order_id: registration.id,
      }),
    });
    await saveInvoice(registration.id, created);
    return invoiceToView(created, amount);
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

async function saveInvoice(registrationId: string, invoice: ApipayInvoice) {
  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      kaspiOrderId: String(invoice.id),
      kaspiPaymentUrl: invoice.qr_token_url ?? null,
      kaspiQrImageUrl: invoice.qr_image_url ?? null,
      kaspiQrExpiresAt: invoice.qr_expires_at ? new Date(invoice.qr_expires_at) : null,
    },
  });
}
