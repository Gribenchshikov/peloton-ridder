import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getRegistrationForPayment } from "@/lib/queries";
import { isTestPaymentModeEnabled } from "@/lib/kaspi";
import { ensureQrInvoice, isApipayConfigured, type PaymentInvoiceView } from "@/lib/apipay";
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

  let invoice: PaymentInvoiceView | null = null;
  if (registration.status === "RESERVED" && isApipayConfigured()) {
    invoice = await ensureQrInvoice(registration);
    if (invoice.amount < 1) {
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
