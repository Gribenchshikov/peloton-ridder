import { useTranslations } from "next-intl";
import { EventCard } from "@/components/EventCard";
import { getEventsByYear, getPublishedEventYears, getSiteSetting } from "@/lib/queries";
import { SeasonSelect } from "./SeasonSelect";

function seasonYears(publishedYears: number[], currentYear: number) {
  const years = new Set(publishedYears);
  years.add(currentYear);
  return [...years].sort((a, b) => b - a);
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const [publishedYears, bgUrl] = await Promise.all([
    getPublishedEventYears(),
    getSiteSetting("bg_events"),
  ]);
  const years = seasonYears(publishedYears, currentYear);
  const requested = Number(yearParam);
  const selectedYear = years.includes(requested) ? requested : currentYear;
  const events = await getEventsByYear(selectedYear);

  return (
    <EventsView years={years} selectedYear={selectedYear} events={events} bgUrl={bgUrl || null} />
  );
}

function EventsView({
  years,
  selectedYear,
  events,
  bgUrl,
}: {
  years: number[];
  selectedYear: number;
  bgUrl: string | null;
  events: Awaited<ReturnType<typeof getEventsByYear>>;
}) {
  const t = useTranslations("Events");

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
            <SeasonSelect years={years} selectedYear={selectedYear} />
          </div>

          {events.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className={`mt-8 ${bgUrl ? "text-white/70" : "text-ink-faint"}`}>
              {t("emptyCalendar", { year: selectedYear })}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
