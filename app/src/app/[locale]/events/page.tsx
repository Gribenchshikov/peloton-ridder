import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EventCard } from "@/components/EventCard";
import { getHomeEvents } from "@/lib/queries";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const isArchive = tab === "archive";
  const events = await getHomeEvents();
  const filtered = events.filter((e) => (isArchive ? e.status === "COMPLETED" : e.status !== "COMPLETED"));

  return <EventsView isArchive={isArchive} events={filtered} />;
}

function EventsView({
  isArchive,
  events,
}: {
  isArchive: boolean;
  events: Awaited<ReturnType<typeof getHomeEvents>>;
}) {
  const t = useTranslations("Events");

  const tabClass = (active: boolean) =>
    `rounded-[var(--radius-s)] px-4 py-2 text-sm font-bold transition-colors ${
      active ? "bg-ember text-white" : "text-ink-soft hover:bg-surface-2"
    }`;

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("eyebrow")}</span>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{t("title")}</h1>
          <div className="flex gap-1 rounded-[var(--radius-m)] border border-border bg-surface p-1">
            <Link href="/events" className={tabClass(!isArchive)}>
              {t("calendarTab")}
            </Link>
            <Link href="/events?tab=archive" className={tabClass(isArchive)}>
              {t("archiveTab")}
            </Link>
          </div>
        </div>

        {events.length > 0 ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="mt-8 text-ink-faint">{isArchive ? t("emptyArchive") : t("emptyCalendar")}</p>
        )}
      </div>
    </main>
  );
}
