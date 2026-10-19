import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getRegistrationForPayment } from "@/lib/queries";
import { isTestPaymentModeEnabled } from "@/lib/kaspi";
import { ensurePaidBibNumber } from "@/lib/bibNumbers";
import { ensureQrInvoice, isApipayConfigured, peekQrInvoice, type PaymentInvoiceView } from "@/lib/apipay";
import { registrationPaymentAmount } from "@/lib/paymentAmount";
import { PaymentView } from "./PaymentView";

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
  if (!registration || registration.userId !== session.user.id) notFound();
  if (registration.status === "PAID" && !registration.isTransferOnly && registration.bibNumber == null) {
    const bibNumber = await ensurePaidBibNumber(registration.id);
    registration = { ...registration, bibNumber };
  }

  let invoice: PaymentInvoiceView | null = null;
  if (registration.status === "RESERVED" && isApipayConfigured()) {
    const amount = registrationPaymentAmount(registration);
    // Счёт в ApiPay создаём только по кнопке «Оплатить в Kaspi».
    if (amount < 1) {
      invoice = await ensureQrInvoice(registration);
      registration = await getRegistrationForPayment(registrationId);
      if (!registration) notFound();
    } else if (registration.kaspiOrderId) {
      invoice = await peekQrInvoice(registration);
      registration = await getRegistrationForPayment(registrationId);
      if (!registration) notFound();
    }
  }

  return (
    <PaymentView
      registration={registration}
      testMode={isTestPaymentModeEnabled() || Boolean(invoice?.sandbox)}
      locale={locale}
      invoice={invoice}
    />
  );
}
