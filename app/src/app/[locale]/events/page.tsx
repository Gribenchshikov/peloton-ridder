import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EventCard } from "@/components/EventCard";
import { getHomeEvents, getArchiveEvents } from "@/lib/queries";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const isArchive = tab === "archive";
  const filtered = isArchive ? await getArchiveEvents() : await getHomeEvents();

  return <EventsView isArchive={isArchive} events={filtered} />;
}

function EventsView({
  isArchive,
  events,
}: {
  isArchive: boolean;
  events: Awaited<ReturnType<typeof getArchiveEvents>>;
}) {
  const t = useTranslations("Events");

  const tabClass = (active: boolean) =>
    `rounded-full px-[18px] py-[9px] text-[.85rem] font-bold transition-colors ${
      active
        ? "bg-surface text-ink shadow-[0_1px_4px_rgba(0,0,0,.12)]"
        : "text-ink-soft hover:text-ink"
    }`;

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ember">
          <span className="h-1.5 w-1.5 rounded-full bg-ember" />
          {t("eyebrow")}
        </span>
        <div className="mt-2.5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{t("title")}</h1>
          <div className="inline-flex gap-0.5 rounded-full border border-border bg-surface-2 p-1">
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
