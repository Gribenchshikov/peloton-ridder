import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { EventCard } from "@/components/EventCard";
import { getHomeEvents, getArchiveEvents } from "@/lib/queries";
import { getSiteSetting } from "@/lib/queries";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const isArchive = tab === "archive";
  const [filtered, bgUrl] = await Promise.all([
    isArchive ? getArchiveEvents() : getHomeEvents(),
    getSiteSetting("bg_events"),
  ]);

  return <EventsView isArchive={isArchive} events={filtered} bgUrl={bgUrl || null} />;
}

function EventsView({
  isArchive,
  events,
  bgUrl,
}: {
  isArchive: boolean;
  bgUrl: string | null;
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
    <main
      className="relative flex-1"
      style={
        bgUrl
          ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      {bgUrl && <div className="absolute inset-0 bg-black/65" aria-hidden />}

      <div className="relative px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ember">
            <span className="h-1.5 w-1.5 rounded-full bg-ember" />
            {t("eyebrow")}
          </span>

          <div className="mt-2.5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className={`font-display text-2xl font-bold sm:text-3xl ${bgUrl ? "text-white" : "text-ink"}`}>
              {t("title")}
            </h1>
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
            <p className={`mt-8 ${bgUrl ? "text-white/70" : "text-ink-faint"}`}>
              {isArchive ? t("emptyArchive") : t("emptyCalendar")}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
