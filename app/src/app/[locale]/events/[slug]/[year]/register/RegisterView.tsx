import { useTranslations } from "next-intl";
import type { getEventForRegistration } from "@/lib/queries";
import { DistanceSelect } from "./DistanceSelect";

type EventWithDistances = NonNullable<Awaited<ReturnType<typeof getEventForRegistration>>>;

export function RegisterView({ event, locale }: { event: EventWithDistances; locale: string }) {
  const t = useTranslations("Registration");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("eyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">
          {t("title", { race: `${event.race.name} ${event.year}` })}
        </h1>
      </div>
      <DistanceSelect eventId={event.id} locale={locale} distances={event.distances} />
    </main>
  );
}
