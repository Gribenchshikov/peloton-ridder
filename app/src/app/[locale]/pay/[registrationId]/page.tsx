import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getRegistrationForPayment } from "@/lib/queries";
import { isTestPaymentModeEnabled } from "@/lib/kaspi";
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

  const registration = await getRegistrationForPayment(registrationId);
  if (!registration || registration.userId !== session.user.id) notFound();

  return <PaymentView registration={registration} testMode={isTestPaymentModeEnabled()} locale={locale} />;
}
