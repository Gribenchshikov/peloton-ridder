import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { getEventForRegistration, getUserContactInfo } from "@/lib/queries";
import { fullName } from "@/lib/user";
import { DistanceSelect } from "./DistanceSelect";

type BaseEvent = NonNullable<Awaited<ReturnType<typeof getEventForRegistration>>>;
type UserContactInfo = NonNullable<Awaited<ReturnType<typeof getUserContactInfo>>>;

type RunningClub = { id: string; name: string; city: string | null };

type EventWithSlots = Omit<BaseEvent, "distances"> & {
  distances: (BaseEvent["distances"][number] & { capacity: number; taken: number })[];
};

export function RegisterView({
  event,
  profile,
  locale,
  clubs,
  callbackPath,
  tshirtSizeGuideUrl,
  hasBirthDate,
  defaultTshirtSize,
  defaultClubId,
}: {
  event: EventWithSlots;
  profile: UserContactInfo;
  locale: string;
  clubs: RunningClub[];
  callbackPath: string;
  tshirtSizeGuideUrl?: string | null;
  hasBirthDate: boolean;
  defaultTshirtSize?: string | null;
  defaultClubId?: string | null;
}) {
  const t = useTranslations("Registration");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("eyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">
          {t("title", { race: `${event.race.name} ${event.year}` })}
        </h1>
      </div>
      <ParticipantCard profile={profile} callbackPath={callbackPath} />
      <DistanceSelect eventId={event.id} locale={locale} distances={event.distances} merchItems={event.merchItems} clubs={clubs} tshirtSizeGuideUrl={tshirtSizeGuideUrl} hasBirthDate={hasBirthDate} defaultTshirtSize={defaultTshirtSize} transferPrice={event.transferPrice} location={event.location} defaultClubId={defaultClubId} />
    </main>
  );
}

function ParticipantCard({ profile, callbackPath }: { profile: UserContactInfo; callbackPath: string }) {
  const t = useTranslations("Registration");

  const name = fullName(profile);
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-ink">{t("participantTitle")}</h2>
        <Link
          href={{ pathname: "/account", query: { callbackUrl: callbackPath } }}
          className="text-sm font-semibold text-ember hover:underline"
        >
          {t("editCta")}
        </Link>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-ember text-sm font-bold text-white">
              {initials}
            </div>
          )}
        </div>
        <p className="text-sm text-ink-soft">{t("participantHint")}</p>
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Field label={t("participantName")} value={name} />
        <Field label={t("participantEmail")} value={profile.email} />
        {profile.city && <Field label={t("participantCity")} value={profile.city} />}
        {profile.phone && <Field label={t("participantPhone")} value={profile.phone} />}
      </dl>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="font-semibold text-ink">{value}</dd>
    </div>
  );
}
