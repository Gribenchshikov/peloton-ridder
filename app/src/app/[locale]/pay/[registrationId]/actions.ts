"use server";

import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { confirmPayment } from "@/lib/kaspi";
import { confirmIfInvoicePaid, ensureQrInvoice, isApipayConfigured, simulateInvoicePaid } from "@/lib/apipay";
import { simulationGate } from "@/lib/apipayPayment";
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
  const gate = simulationGate(process.env);
  if (gate === "forbidden") {
    throw new Error("simulatePaymentAction: test payment mode is disabled");
  }

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

  if (gate === "provider_sandbox") {
    if (!existing.kaspiOrderId) {
      throw new Error("simulatePaymentAction: sandbox invoice is missing");
    }
    await simulateInvoicePaid(existing.kaspiOrderId);
    const result = await confirmIfInvoicePaid(registrationId, existing.kaspiOrderId);
    if (!result.confirmed) {
      throw new Error(`simulatePaymentAction: payment was not confirmed (${result.error ?? "not_paid"})`);
    }
    redirect({ href: `/pay/${registrationId}`, locale });
  }

  const registration = await confirmPayment(registrationId, userId, undefined, undefined, undefined, {
    trustedTestConfirmation: true,
  });
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

