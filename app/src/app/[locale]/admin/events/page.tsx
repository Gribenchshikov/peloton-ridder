import { requireAdminPage } from "@/lib/session";
import { getAdminEvents } from "@/lib/queries";
import { Link } from "@/i18n/navigation";
import { AdminEventsTable } from "../AdminEventsTable";

export default async function AdminEventsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/events");

  const events = await getAdminEvents();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="mb-1 block text-sm font-semibold text-ink-faint hover:text-ink">
            ← Админка
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink">Забеги</h1>
        </div>
        <Link
          href="/admin/events/new"
          className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
        >
          + Создать забег
        </Link>
      </div>

      <AdminEventsTable events={events} />
    </main>
  );
}
