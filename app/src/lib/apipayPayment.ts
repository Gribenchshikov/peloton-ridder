export const PAYMENT_CURRENCY = "KZT";

export type PaymentEnv = {
  NODE_ENV?: string;
  ALLOW_TEST_PAYMENTS?: string;
  APIPAY_API_KEY?: string;
  APIPAY_SANDBOX?: string;
};

export type PaymentVerificationCode =
  | "amount_mismatch"
  | "currency_mismatch"
  | "invoice_mismatch"
  | "simulation_forbidden"
  | "not_paid";

export class PaymentVerificationError extends Error {
  readonly code: PaymentVerificationCode;

  constructor(code: PaymentVerificationCode) {
    super(code);
    this.name = "PaymentVerificationError";
    this.code = code;
  }
}

export type SimulationGate = "forbidden" | "local_stub" | "provider_sandbox";

/** Серверное окружение. Параметры запроса сюда не входят. */
export function simulationGate(env: PaymentEnv): SimulationGate {
  if (env.ALLOW_TEST_PAYMENTS !== "true") return "forbidden";
  const productionRuntime = env.NODE_ENV === "production";
  const sandboxServer = env.APIPAY_SANDBOX === "true";
  if (productionRuntime && !sandboxServer) return "forbidden";
  if (env.APIPAY_API_KEY) {
    if (!sandboxServer) return "forbidden";
    return "provider_sandbox";
  }
  return "local_stub";
}

export function providerSimulationAllowed(env: PaymentEnv, invoiceIsSandbox: boolean) {
  return simulationGate(env) === "provider_sandbox" && invoiceIsSandbox === true;
}

export function serverUsesSandbox(env: PaymentEnv) {
  return env.APIPAY_SANDBOX === "true";
}

/** Счёт и сервер должны быть в одном режиме. Флаг без явного boolean не принимается. */
export function paymentModeMatches(serverSandbox: boolean, isSandbox: boolean | null | undefined) {
  return typeof isSandbox === "boolean" && isSandbox === serverSandbox;
}

export function showPaymentSimulation(invoiceIsSandbox: boolean | null, env: PaymentEnv) {
  const gate = simulationGate(env);
  if (gate === "local_stub") return true;
  // Ответ создания QR может не содержать is_sandbox. Боевой счёт (false) кнопку не получает.
  if (gate === "provider_sandbox") return invoiceIsSandbox !== false;
  return false;
}

/**
 * Суммы в тенге. Дробная часть меньше 0.001 считается тем же целым значением
 * ("15000.00" и 15000). Иная сумма не совпадает.
 */
export function moneyMatches(paid: unknown, expected: number): boolean {
  if (!Number.isFinite(expected)) return false;
  const value = typeof paid === "number" ? paid : typeof paid === "string" ? Number(paid.trim()) : Number.NaN;
  if (!Number.isFinite(value)) return false;
  return Math.abs(value - expected) < 0.001;
}

/**
 * Пустая валюта не отклоняется: текущий контракт ApiPay может не присылать поле.
 * Любое явное значение, кроме KZT, отклоняется.
 */
export function currencyAccepted(currency: string | null | undefined): boolean {
  if (currency == null || currency.trim() === "") return true;
  return currency.trim().toUpperCase() === PAYMENT_CURRENCY;
}

/**
 * POST /invoices/qr отдаёт qr_image_url, а GET /invoices/{id} — только
 * qr_image_path относительно storage. Без сборки полного адреса страница
 * оплаты остаётся без картинки QR.
 */
export function kaspiQrImageUrl(
  invoice: { qr_image_url?: string | null; qr_image_path?: string | null },
  apiBase = "https://api.apipay.kz/api/v1",
): string | null {
  const direct = invoice.qr_image_url?.trim();
  if (direct) return direct;
  const path = invoice.qr_image_path?.trim();
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  let origin = "https://api.apipay.kz";
  try {
    origin = new URL(apiBase).origin;
  } catch {
    origin = "https://api.apipay.kz";
  }
  const relative = path.replace(/^\/+/, "");
  const storagePath = relative.startsWith("storage/") ? relative : `storage/${relative}`;
  return `${origin}/${storagePath}`;
}

export type PaymentTransition = "pay" | "replay" | "ignore" | PaymentVerificationCode;

export function decidePaymentTransition(input: {
  status: string;
  expectedAmount: number;
  paidAmount?: unknown;
  trustedTestConfirmation?: boolean;
  currentInvoiceId?: string | null;
  paidInvoiceId?: string | null;
  currency?: string | null;
}): PaymentTransition {
  if (input.trustedTestConfirmation) {
    if (input.status === "PAID") return "replay";
    if (input.status === "RESERVED") return "pay";
    return "ignore";
  }
  if (!currencyAccepted(input.currency)) return "currency_mismatch";
  if (
    input.currentInvoiceId &&
    input.paidInvoiceId &&
    input.currentInvoiceId !== input.paidInvoiceId
  ) {
    return "invoice_mismatch";
  }
  const amountProvided = input.paidAmount != null && input.paidAmount !== "";
  if (input.expectedAmount >= 1) {
    if (!moneyMatches(input.paidAmount, input.expectedAmount)) return "amount_mismatch";
  } else if (amountProvided && !moneyMatches(input.paidAmount, input.expectedAmount)) {
    return "amount_mismatch";
  }
  if (input.status === "PAID") return "replay";
  if (input.status === "RESERVED") return "pay";
  return "ignore";
}

export type TrustedRefund = {
  id: number | string;
  invoice_id?: number | string | null;
  amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
};

export type LocalRefundMatch = {
  apipayRefundId: string | null;
  invoiceId: string | null;
  amount: number | null;
  payoutStatus: string | null;
  status: string;
  registrationStatus: string;
};

export type RefundVerdict = "apply" | "replay" | "reject";

export function verifyRefundMatch(input: {
  invoiceId: string;
  refundId: string;
  trusted: TrustedRefund | null;
  local: LocalRefundMatch | null;
}): RefundVerdict {
  const { trusted, local } = input;
  if (!trusted || !local) return "reject";
  if (String(trusted.id) !== input.refundId) return "reject";
  if (local.apipayRefundId !== input.refundId) return "reject";
  if (trusted.invoice_id != null && String(trusted.invoice_id) !== input.invoiceId) return "reject";
  if (local.invoiceId && local.invoiceId !== input.invoiceId) return "reject";
  if (!currencyAccepted(trusted.currency)) return "reject";
  if (trusted.status !== "completed") return "reject";
  if (local.amount == null || !moneyMatches(trusted.amount, local.amount)) return "reject";
  if (local.payoutStatus === "completed" && local.status === "CONFIRMED") return "replay";
  if (local.status !== "PENDING" && local.status !== "CONFIRMED") return "reject";
  if (
    local.registrationStatus !== "PAID" &&
    local.registrationStatus !== "RESERVED" &&
    local.registrationStatus !== "CANCELLED"
  ) {
    return "reject";
  }
  return "apply";
}
