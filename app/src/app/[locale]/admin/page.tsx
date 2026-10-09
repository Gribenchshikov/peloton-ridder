import { requireAdminPage } from "@/lib/session";
import { countPendingRefundRequests } from "@/lib/queries";
import { AdminView } from "./AdminView";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale);
  const pendingRefundCount = await countPendingRefundRequests();

  return <AdminView pendingRefundCount={pendingRefundCount} />;
}
