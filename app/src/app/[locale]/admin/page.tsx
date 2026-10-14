import { requireAdminPage } from "@/lib/session";
import { countPendingRefundRequests } from "@/lib/queries";
import { retrySkippedRefundPayouts } from "@/lib/refundPayout";
import { AdminView } from "./AdminView";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale);
  await retrySkippedRefundPayouts();
  const pendingRefundCount = await countPendingRefundRequests();

  return <AdminView pendingRefundCount={pendingRefundCount} />;
}
