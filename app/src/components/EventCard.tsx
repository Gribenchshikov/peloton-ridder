import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Icon } from "./IconSprite";
import type { Event, Race, Distance } from "@/generated/prisma/client";

type EventWithRelations = Event & { race: Race; distances: Distance[] };

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-success-tint text-success",
  DRAFT: "bg-surface-2 text-ink-faint",
  CLOSED: "bg-warn-tint text-warn",
  COMPLETED: "bg-surface-2 text-ink-faint",
};

export function EventCard({ event }: { event: EventWithRelations }) {
  const t = useTranslations("Status");
  const tc = useTranslations("Common");
  const format = useFormatter();
  const dist = event.distances.map((d) => d.km).sort((a, b) => a - b);
  const distLabel = [...new Set(dist)].join(" / ") + " " + tc("km");

  return (
    <Link
      href={`/events/${event.race.slug}/${event.year}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-m)] border border-border bg-surface transition-transform hover:-translate-y-1"
    >
      <div
        className="relative flex h-28 items-center justify-center"
        style={{ backgroundColor: event.race.color }}
      >
        {event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon name={event.race.icon} className="h-10 w-10 text-white/80" />
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide backdrop-blur ${STATUS_STYLE[event.status]}`}
        >
          {t(event.status)}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <h3 className="font-display text-lg font-bold text-ink">{event.race.name}</h3>
        <div className="text-sm font-semibold tabular-nums text-ink-soft">
          {format.dateTime(event.dateISO, { day: "numeric", month: "long", year: "numeric" })}
        </div>
        <div className="mt-auto text-sm text-ink-faint">{distLabel}</div>
      </div>
    </Link>
  );
}
