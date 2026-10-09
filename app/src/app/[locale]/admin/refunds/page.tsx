import { requireAdminPage } from "@/lib/session";
import { getPendingRefundRequests } from "@/lib/queries";
import { Link } from "@/i18n/navigation";
import { RefundRequestsSection } from "../events/[id]/registrations/RefundRequestsSection";

export default async function AdminRefundsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/refunds");

  const refunds = await getPendingRefundRequests();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Link href="/admin" className="mb-1 block text-sm font-semibold text-ink-faint hover:text-ink">
        ← Админка
      </Link>
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">Заявки на возврат</h1>

      {refunds.length === 0 ? (
        <p className="rounded-[var(--radius-m)] border border-dashed border-border p-6 text-sm text-ink-faint">
          Необработанных заявок нет.
        </p>
      ) : (
        <RefundRequestsSection refunds={refunds} showEvent title="Необработанные заявки" />
      )}
    </main>
  );
}
