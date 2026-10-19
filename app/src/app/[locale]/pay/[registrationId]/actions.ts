"use server";

import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { isTestPaymentModeEnabled, confirmPayment } from "@/lib/kaspi";
import { confirmIfInvoicePaid, ensureQrInvoice, isApipayConfigured, simulateInvoicePaid } from "@/lib/apipay";
import { getRegistrationForPayment } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export async function startKaspiPaymentAction(
  locale: string,
  registrationId: string,
): Promise<{ paymentUrl: string | null; error?: string }> {
  const userId = await requireUserId();
  if (!userId) throw new Error("startKaspiPaymentAction: no session");

  const registration = await getRegistrationForPayment(registrationId);
  if (!registration || registration.userId !== userId) {
    throw new Error("startKaspiPaymentAction: registration not found or not owned by user");
  }
  if (registration.status !== "RESERVED") {
    redirect({ href: `/pay/${registrationId}`, locale });
  }
  if (!isApipayConfigured()) {
    redirect({ href: `/pay/${registrationId}`, locale });
  }

  const invoice = await ensureQrInvoice(registration);
  return { paymentUrl: invoice.paymentUrl, error: invoice.error ?? undefined };
}

export async function simulatePaymentAction(locale: string, registrationId: string) {
  const userId = await requireUserId();
  if (!userId) {
    throw new Error("simulatePaymentAction: no session");
  }

  const existing = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { userId: true, kaspiOrderId: true },
  });
  if (!existing || existing.userId !== userId) {
    throw new Error("simulatePaymentAction: registration not found or not owned by user");
  }

  if (isApipayConfigured() && existing.kaspiOrderId) {
    await simulateInvoicePaid(existing.kaspiOrderId);
    const invoice = await confirmIfInvoicePaid(registrationId, existing.kaspiOrderId);
    if (invoice.status !== "paid") {
      throw new Error("simulatePaymentAction: ApiPay did not mark invoice paid");
    }
    redirect({ href: `/pay/${registrationId}`, locale });
  }

  if (!isTestPaymentModeEnabled()) {
    throw new Error("simulatePaymentAction: test payment mode is disabled");
  }

  const registration = await confirmPayment(registrationId, userId);
  if (!registration) {
    throw new Error("simulatePaymentAction: registration not found or not owned by user");
  }

  redirect({ href: `/pay/${registrationId}`, locale });
}

export async function refreshKaspiQrAction(
  locale: string,
  registrationId: string,
): Promise<{ paymentUrl: string | null; error?: string }> {
  const userId = await requireUserId();
  if (!userId) throw new Error("refreshKaspiQrAction: no session");

  const registration = await getRegistrationForPayment(registrationId);
  if (!registration || registration.userId !== userId) throw new Error("refreshKaspiQrAction: not found");
  if (registration.status !== "RESERVED") return { paymentUrl: null };

  const invoice = await ensureQrInvoice(registration, true);
  return { paymentUrl: invoice.paymentUrl, error: invoice.error ?? undefined };
}

