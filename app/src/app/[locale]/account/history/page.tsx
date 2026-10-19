import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { repairPaidInvoiceDates } from "@/lib/apipay";
import { getUserProfile } from "@/lib/queries";
import { RegistrationHistory } from "../RegistrationHistory";

export default async function AccountHistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: "/login", locale });
  }

  await repairPaidInvoiceDates({ userId: session.user.id });
  const profile = await getUserProfile(session.user.id);
  if (!profile) {
    return redirect({ href: "/login", locale });
  }

  return <RegistrationHistory registrations={profile.registrations} />;
}
