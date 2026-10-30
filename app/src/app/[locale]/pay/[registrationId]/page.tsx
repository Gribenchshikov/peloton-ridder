import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getRegistrationForPayment } from "@/lib/queries";
import { canShowPaymentSimulation } from "@/lib/kaspi";
import { ensurePaidBibNumber } from "@/lib/bibNumbers";
import { ensureQrInvoice, isApipayConfigured, type PaymentInvoiceView } from "@/lib/apipay";
import { PaymentView } from "./PaymentView";
import { ownsRegistration } from "@/lib/ownership";

export default async function PayPage({
  params,
}: {
  params: Promise<{ locale: string; registrationId: string }>;
}) {
  const { locale, registrationId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({
      href: { pathname: "/login", query: { callbackUrl: `/pay/${registrationId}` } },
      locale,
    });
  }

  let registration = await getRegistrationForPayment(registrationId);
  if (!registration || !ownsRegistration(session.user.id, registration.userId)) notFound();
  if (registration.status === "PAID" && !registration.isTransferOnly && registration.bibNumber == null) {
    const bibNumber = await ensurePaidBibNumber(registration.id);
    registration = { ...registration, bibNumber };
  }

  let invoice: PaymentInvoiceView | null = null;
  if (registration.status === "RESERVED" && isApipayConfigured()) {
    // QR готов вместе с кнопкой: действующий счёт переиспользуем, истёкший заменяем.
    invoice = await ensureQrInvoice(registration);
    registration = await getRegistrationForPayment(registrationId);
    if (!registration) notFound();
  }

  return (
    <PaymentView
      registration={registration}
      testMode={canShowPaymentSimulation(invoice ? invoice.sandbox : null)}
      locale={locale}
      invoice={invoice}
    />
  );
}
