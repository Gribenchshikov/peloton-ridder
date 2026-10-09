"use server";

import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { isTestPaymentModeEnabled, confirmPayment } from "@/lib/kaspi";
import { confirmIfInvoicePaid, ensureQrInvoice, isApipayConfigured, simulateInvoicePaid } from "@/lib/apipay";
import { getRegistrationForPayment } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

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

export async function refreshKaspiQrAction(locale: string, registrationId: string) {
  const userId = await requireUserId();
  if (!userId) throw new Error("refreshKaspiQrAction: no session");

  const registration = await getRegistrationForPayment(registrationId);
  if (!registration || registration.userId !== userId) throw new Error("refreshKaspiQrAction: not found");
  if (registration.status !== "RESERVED") return;

  await ensureQrInvoice(registration, true);
  redirect({ href: `/pay/${registrationId}`, locale });
}

export async function cancelReservationAction(locale: string, registrationId: string) {
  const userId = await requireUserId();
  if (!userId) throw new Error("cancelReservationAction: no session");

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      userId: true,
      status: true,
      event: { select: { year: true, race: { select: { slug: true } } } },
    },
  });

  if (!registration || registration.userId !== userId) throw new Error("cancelReservationAction: not found");

  const backHref = `/events/${registration.event.race.slug}/${registration.event.year}`;

  if (registration.status === "RESERVED") {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { status: "CANCELLED", reservedUntil: null },
    });
  }

  redirect({ href: backHref, locale });
}
