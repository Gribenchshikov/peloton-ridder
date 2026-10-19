export type InvoicePayment = { id: string; status: "paid" | "cancelled" };

export type RegistrationPaymentRow = {
  invoiceId: string | null;
  paymentStatus: "paid" | "cancelled" | "reserved";
  isCurrent: boolean;
  paidAt: Date | null;
};

export function parsePaidInvoiceAt(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) continue;
    out[key] = raw;
  }
  return out;
}

export function withPaidInvoiceAt(
  existing: unknown,
  invoiceId: string | null | undefined,
  paidAt: Date,
): Record<string, string> {
  const map = parsePaidInvoiceAt(existing);
  if (!invoiceId || map[invoiceId]) return map;
  return { ...map, [invoiceId]: paidAt.toISOString() };
}

function paidAtForInvoice(map: Record<string, string>, invoiceId: string | null): Date | null {
  if (!invoiceId || !map[invoiceId]) return null;
  const date = new Date(map[invoiceId]);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function collectPaidInvoices(reg: {
  status: string;
  kaspiOrderId?: string | null;
  paidInvoiceIds?: string[] | null;
}): InvoicePayment[] {
  const ids: string[] = [];
  for (const id of reg.paidInvoiceIds ?? []) {
    if (id && !ids.includes(id)) ids.push(id);
  }
  if (reg.kaspiOrderId && !ids.includes(reg.kaspiOrderId)) {
    if (reg.status === "PAID" || reg.status === "CANCELLED" || ids.length > 0) {
      ids.push(reg.kaspiOrderId);
    }
  }
  const currentPaid =
    reg.status === "PAID" ? (reg.kaspiOrderId ?? ids[ids.length - 1] ?? null) : null;
  return ids.map((id) => ({
    id,
    status: currentPaid && id === currentPaid ? "paid" : "cancelled",
  }));
}

export function compareInvoiceDesc(a: string | null | undefined, b: string | null | undefined): number {
  const na = a && Number.isFinite(Number(a)) ? Number(a) : -1;
  const nb = b && Number.isFinite(Number(b)) ? Number(b) : -1;
  return nb - na;
}

export function expandRegistrationPayments(reg: {
  status: string;
  kaspiOrderId?: string | null;
  paidInvoiceIds?: string[] | null;
  paidInvoiceAt?: unknown;
}): RegistrationPaymentRow[] {
  const paidAtMap = parsePaidInvoiceAt(reg.paidInvoiceAt);
  const invoices = collectPaidInvoices(reg);
  if (invoices.length === 0) {
    return [
      {
        invoiceId: null,
        paymentStatus:
          reg.status === "RESERVED" ? "reserved" : reg.status === "PAID" ? "paid" : "cancelled",
        isCurrent: true,
        paidAt: null,
      },
    ];
  }
  const hasPaid = invoices.some((invoice) => invoice.status === "paid");
  return invoices.map((invoice, index) => ({
    invoiceId: invoice.id,
    paymentStatus: invoice.status,
    isCurrent: invoice.status === "paid" || (!hasPaid && index === invoices.length - 1),
    paidAt: paidAtForInvoice(paidAtMap, invoice.id),
  }));
}
