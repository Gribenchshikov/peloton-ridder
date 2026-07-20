import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

async function getOpenEventsForVolunteer() {
  return prisma.event.findMany({
    where: { status: "OPEN" },
    select: { id: true, year: true, dateISO: true, race: { select: { name: true, slug: true } } },
    orderBy: { dateISO: "asc" },
  });
}

export default async function VolunteerPage() {
  const events = await getOpenEventsForVolunteer();
  return <VolunteerView events={events} />;
}

function VolunteerView({
  events,
}: {
  events: Awaited<ReturnType<typeof getOpenEventsForVolunteer>>;
}) {
  const t = useTranslations("VolunteerPage");
  const format = useFormatter();

  const perks = [
    { icon: "🎯", title: t("perk1Title"), body: t("perk1Body") },
    { icon: "🤝", title: t("perk2Title"), body: t("perk2Body") },
    { icon: "🎫", title: t("perk3Title"), body: t("perk3Body") },
  ];

  const roles = [t("role1"), t("role2"), t("role3"), t("role4")];

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        {/* Hero */}
        <span className="text-xs font-bold uppercase tracking-wide text-ember">
          {t("eyebrow")}
        </span>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-ink sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-ink-soft">
          {t("lead")}
        </p>

        {/* Honest badge */}
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-ink-soft">
          <span className="font-bold text-ink">{t("honestBadgeLabel")}</span>
          {t("honestBadgeText")}
        </div>

        {/* What volunteers do */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-ink">{t("rolesTitle")}</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {roles.map((role, i) => (
              <li key={i} className="flex items-start gap-3 rounded-[var(--radius-s)] border border-border bg-surface px-4 py-3 text-sm text-ink">
                <span className="mt-0.5 text-ember">→</span>
                {role}
              </li>
            ))}
          </ul>
        </section>

        {/* Perks */}
        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-ink">{t("perksTitle")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {perks.map((p, i) => (
              <div key={i} className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
                <div className="text-2xl">{p.icon}</div>
                <p className="mt-3 font-semibold text-ink">{p.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Open events */}
        {events.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-xl font-bold text-ink">{t("eventsTitle")}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t("eventsSubtitle")}</p>
            <div className="mt-4 flex flex-col gap-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-m)] border border-border bg-surface p-4"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {event.race.name} {event.year}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-faint">
                      {format.dateTime(event.dateISO, { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <Link
                    href={`/volunteer/apply?eventId=${event.id}`}
                    className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                  >
                    {t("applyCta")}
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {events.length === 0 && (
          <section className="mt-12">
            <p className="rounded-[var(--radius-m)] border border-dashed border-border p-6 text-center text-sm text-ink-faint">
              {t("noEvents")}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
