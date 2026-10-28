import { requireAdminPage } from "@/lib/session";
import { countPendingRefundRequests } from "@/lib/queries";
import { retrySkippedRefundPayouts, settleAcceptedRefundsOnce } from "@/lib/refundPayout";
import { RefreshOpenRefunds } from "@/components/RefreshOpenRefunds";
import { AdminView } from "./AdminView";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale);
  await retrySkippedRefundPayouts();
  await settleAcceptedRefundsOnce();
  const pendingRefundCount = await countPendingRefundRequests();

  return (
    <>
      <RefreshOpenRefunds empty={pendingRefundCount === 0} />
      <AdminView pendingRefundCount={pendingRefundCount} />
    </>
  );
}
