import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Event, Race, Distance } from "@/generated/prisma/client";

type EventWithRelations = Event & { race: Race; distances: Distance[] };

const STATUS_LABEL_KEY: Record<string, string> = {
  OPEN: "OPEN",
  DRAFT: "DRAFT",
  CLOSED: "CLOSED",
  COMPLETED: "COMPLETED",
};

const STATUS_DOT: Record<string, string> = {
  OPEN: "bg-spruce",
  DRAFT: "bg-warn",
  CLOSED: "bg-warn",
  COMPLETED: "bg-ink-faint",
};

export function EventCard({ event }: { event: EventWithRelations }) {
  const t = useTranslations("Status");
  const tc = useTranslations("Common");
  const format = useFormatter();

  const kmValues = [...new Set(event.distances.map((d) => d.km).filter(Boolean).sort((a, b) => a - b))];
  const distLabel = kmValues.length > 0 ? kmValues.join(" / ") + " " + tc("km") : "—";

  return (
    <Link
      href={`/events/${event.race.slug}/${event.year}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-m)] border border-border bg-surface transition-all duration-200 hover:-translate-y-1 hover:border-[var(--ink-faint)] hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,.18)]"
    >
      <div
        className="relative h-28 overflow-hidden"
        style={{ backgroundColor: event.race.color }}
      >
        {event.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.coverImageUrl}
            alt=""
            className="h-full w-full object-cover object-center"
            loading="lazy"
          />
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[event.status]}`} />
          {t(STATUS_LABEL_KEY[event.status] as "OPEN" | "DRAFT" | "CLOSED" | "COMPLETED")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pb-4 pt-4">
        <h3 className="font-display text-[1.05rem] font-extrabold text-ink">
          {event.race.name}
        </h3>
        <div className="text-[.82rem] font-semibold tabular-nums text-ink-soft">
          {format.dateTime(event.dateISO, { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <div className="mt-auto text-[.78rem] text-ink-faint">{distLabel}</div>
      </div>
    </Link>
  );
}
