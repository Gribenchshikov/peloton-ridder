import { requireAdminPage } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { ReportsView } from "./ReportsView";

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { locale } = await params;
  const { eventId } = await searchParams;
  await requireAdminPage(locale, "/admin/reports");

  // All events for the filter dropdown
  const events = await prisma.event.findMany({
    orderBy: { dateISO: "desc" },
    select: { id: true, year: true, race: { select: { name: true } } },
  });

  const whereEvent = eventId ? { eventId } : {};

  // Registrations with distance price
  const registrations = await prisma.registration.findMany({
    where: whereEvent,
    select: {
      id: true,
      status: true,
      createdAt: true,
      discountAmount: true,
      cancelReason: true,
      distance: { select: { price: true, name: true, km: true, maxSlots: true, id: true } },
      event: { select: { id: true, year: true, race: { select: { name: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Slot occupancy per distance
  const distances = eventId
    ? await prisma.distance.findMany({
        where: { eventId },
        select: { id: true, name: true, km: true, maxSlots: true, _count: { select: { registrations: { where: { status: "PAID" } } } } },
        orderBy: { km: "asc" },
      })
    : [];

  // Merch orders (only PAID)
  const merch = await prisma.registrationMerch.findMany({
    where: { registration: { status: "PAID", ...whereEvent } },
    select: { size: true, merchItem: { select: { name: true } } },
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin" className="mb-1 block text-sm font-semibold text-ink-faint hover:text-ink">
            ← Админка
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink">Отчётность</h1>
        </div>

        {/* Event filter */}
        <form method="GET" className="flex items-center gap-2">
          <select
            name="eventId"
            defaultValue={eventId ?? ""}
            onChange={(e) => {
              // handled via ReportsView client wrapper
            }}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          >
            <option value="">Все события</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.race.name} {e.year}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink-soft"
          >
            Применить
          </button>
        </form>
      </div>

      <ReportsView
        registrations={registrations}
        distances={distances}
        merch={merch.map((m) => ({ size: m.size, itemName: m.merchItem.name }))}
        selectedEventName={
          eventId ? (events.find((e) => e.id === eventId)?.race.name ?? "") : ""
        }
      />
    </main>
  );
}
