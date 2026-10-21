import { NextResponse } from "next/server";
import { processApipayWebhook, type TrustedInvoice } from "@/lib/apipayWebhook";
import { confirmPayment } from "@/lib/kaspi";
import {
  findRegistrationForInvoice,
  getInvoice,
  getInvoiceRefund,
  invoicePaidAt,
} from "@/lib/apipay";
import { finalizeMatchedRefund, revalidateRefundViews } from "@/lib/refundPayout";
import { prisma } from "@/lib/prisma";
import { registrationPaymentAmount } from "@/lib/paymentAmount";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const result = await processApipayWebhook({
    rawBody,
    signature: request.headers.get("X-Webhook-Signature"),
    secret: process.env.APIPAY_WEBHOOK_SECRET,
    sandbox: process.env.APIPAY_SANDBOX === "true",
    deps: {
      getInvoice: async (invoiceId) => getInvoice(invoiceId),
      getRefund: async (invoiceId, refundId) => getInvoiceRefund(invoiceId, refundId),
      findRegistration: async (invoice) => {
        const registration = await findRegistrationForInvoice({
          id: Number(invoice.id),
          external_order_id: invoice.external_order_id,
        });
        if (!registration) return null;
        const payable = await prisma.registration.findUnique({
          where: { id: registration.id },
          include: { distance: true, event: { select: { transferPrice: true } } },
        });
        if (!payable) return null;
        return {
          id: payable.id,
          status: payable.status,
          expectedAmount: registrationPaymentAmount(payable),
          kaspiOrderId: payable.kaspiOrderId,
        };
      },
      confirmPaid: async (registrationId, invoice: TrustedInvoice) => {
        await confirmPayment(
          registrationId,
          undefined,
          String(invoice.id),
          typeof invoice.amount === "number" ? invoice.amount : Number(invoice.amount),
          invoicePaidAt(invoice),
          { currency: invoice.currency ?? null },
        );
      },
      findLocalRefund: async (refundId) => {
        const rows = await prisma.refundRequest.findMany({
          where: { apipayRefundId: refundId },
          select: {
            id: true,
            apipayRefundId: true,
            invoiceId: true,
            amount: true,
            payoutStatus: true,
            status: true,
            registration: { select: { status: true, kaspiOrderId: true } },
          },
        });
        if (rows.length !== 1) return null;
        const row = rows[0]!;
        return {
          id: row.id,
          apipayRefundId: row.apipayRefundId,
          invoiceId: row.invoiceId ?? row.registration.kaspiOrderId,
          amount: row.amount,
          payoutStatus: row.payoutStatus,
          status: row.status,
          registrationStatus: row.registration.status,
        };
      },
      applyRefund: async (refundRequestId) => {
        const outcome = await finalizeMatchedRefund(refundRequestId);
        if (outcome.result === "applied" || outcome.result === "replay") revalidateRefundViews();
        return outcome.result;
      },
    },
  });
  return NextResponse.json(result.body, { status: result.status });
}
