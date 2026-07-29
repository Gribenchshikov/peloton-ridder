import { useTranslations, useFormatter } from "next-intl";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getUserProfile, getSeriesWithRaces, getUserSeriesProgress } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { ProfileForm } from "./ProfileForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { CancelRegistrationButton } from "./CancelRegistrationButton";
import { RefundRequestButton } from "./RefundRequestButton";
import { VolunteerProgress } from "./VolunteerProgress";
import { AvatarUpload } from "./AvatarUpload";
import { ClubSection } from "./ClubSection";
import { SeriesMedals } from "./SeriesMedals";
import { StravaSection } from "./StravaSection";
import { logoutAction } from "@/lib/authActions";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string; strava?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl, strava: stravaStatus } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: "/login", locale });
  }

  const currentYear = new Date().getFullYear();
  const [profile, thresholdSetting, series, clubs] = await Promise.all([
    getUserProfile(session.user.id),
    prisma.siteSetting.findUnique({ where: { key: "volunteer_slots_threshold" } }),
    getSeriesWithRaces(),
    prisma.runningClub.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const seriesProgress = series
    ? await getUserSeriesProgress(session.user.id, series.id, currentYear)
    : null;
  if (!profile) {
    return redirect({ href: "/login", locale });
  }

  const volunteerThreshold = Number(thresholdSetting?.value ?? 3);
  // Считаем только те, которые admin вручную зачислил (creditedAt != null)
  const completedVolunteerCount = profile.volunteerApplications.filter(
    (a) => a.creditedAt,
  ).length;

  const hasVolunteerBlock =
    profile.isVolunteer || profile.isAdmin || profile.volunteerApplications.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <AccountHeader name={`${profile.firstName} ${profile.lastName}`} isAdmin={profile.isAdmin} avatarUrl={profile.avatarUrl} />

      {/* Профиль + безопасность */}
      <div className="mt-10 flex flex-col gap-6">
        <ProfileForm
          user={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            city: profile.city ?? "",
            country: profile.country,
            phone: profile.phone ?? "",
            tshirtSize: profile.tshirtSize,
            birthDate: profile.birthDate,
          }}
          locale={locale}
          callbackUrl={callbackUrl}
        />
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          <ChangeEmailForm currentEmail={profile.email} locale={locale} />
          <ChangePasswordForm />
        </div>
      </div>

      {/* Беговой клуб */}
      <div className="mt-10 flex flex-col gap-4 border-t border-border pt-10">
        <SectionLabel>Беговой клуб</SectionLabel>
        <ClubSection
          currentClub={profile.runningClub}
          latestRequest={profile.clubRequests[0] ?? null}
          clubs={clubs}
        />
      </div>

      {/* Strava */}
      <StravaSection
        stravaAthleteId={profile.stravaAthleteId}
        stravaAthleteName={profile.stravaAthleteName}
        status={stravaStatus}
      />

      {/* Волонтёрство */}
      {hasVolunteerBlock && (
        <div className="mt-10 flex flex-col gap-6 border-t border-border pt-10">
          <SectionLabel>Волонтёрство</SectionLabel>
          {(profile.isVolunteer || profile.isAdmin) && (
            <div className="flex flex-wrap gap-3">
              <Link
                href="/volunteer/scan"
                className="rounded-[var(--radius-s)] border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                QR-сканер выдачи набора →
              </Link>
            </div>
          )}
          {profile.isVolunteer && (
            <VolunteerProgress
              completed={completedVolunteerCount}
              threshold={volunteerThreshold}
              rewardClaimedAt={profile.volunteerRewardClaimedAt}
              savedPromoCode={profile.volunteerPromoCode}
            />
          )}
          {profile.volunteerApplications.length > 0 && (
            <VolunteerSection applications={profile.volunteerApplications} />
          )}
        </div>
      )}

      {/* Ridder Race Series */}
      {seriesProgress && seriesProgress.seriesRaces.length > 0 && (
        <div className="mt-10 border-t border-border pt-10">
          <SeriesMedals progress={seriesProgress} year={currentYear} />
        </div>
      )}

      {/* История регистраций */}
      <div className="mt-10 flex flex-col gap-4 border-t border-border pt-10">
        <RegistrationHistory registrations={profile.registrations} />
      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{children}</div>
  );
}

function AccountHeader({ name, isAdmin, avatarUrl }: { name: string; isAdmin: boolean; avatarUrl: string | null }) {
  const t = useTranslations("Account");
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-5">
        <AvatarUpload initialUrl={avatarUrl} name={name} />
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-ember">{t("eyebrow")}</span>
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-ink">{name}</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-1">
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("adminCta")}
          </Link>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("logoutCta")}
          </button>
        </form>
      </div>
    </div>
  );
}

type UserProfile = NonNullable<Awaited<ReturnType<typeof getUserProfile>>>;
type RegistrationRow = UserProfile["registrations"][number];
type VolunteerApp = UserProfile["volunteerApplications"][number];

const VOLUNTEER_STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  PENDING:  { badge: "text-amber-600 dark:text-amber-400",  label: "На рассмотрении" },
  APPROVED: { badge: "text-emerald-600 dark:text-emerald-400", label: "Одобрена ✓" },
  REJECTED: { badge: "text-red-500",                        label: "Отклонена" },
};

function VolunteerSection({ applications }: { applications: VolunteerApp[] }) {
  const countByEvent: Record<string, number> = {};
  for (const app of applications) {
    countByEvent[app.eventId] = (countByEvent[app.eventId] ?? 0) + 1;
  }

  return (
    <div>
      <ul className="flex flex-col gap-3">
        {applications.map((app) => {
          const s = VOLUNTEER_STATUS_STYLES[app.status] ?? VOLUNTEER_STATUS_STYLES.PENDING;
          const borderColor =
            app.status === "APPROVED"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
              : app.status === "REJECTED"
              ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20"
              : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20";
          const canReapply = app.status === "REJECTED" && (countByEvent[app.eventId] ?? 0) < 2;
          return (
            <li key={app.id} className={`rounded-[var(--radius-m)] border p-4 ${borderColor}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">
                    {app.event.race.name} {app.event.year}
                  </p>
                  <p className={`mt-0.5 text-xs font-bold uppercase tracking-wide ${s.badge}`}>
                    {s.label}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {app.status === "APPROVED" && (
                    <>
                      {app.event.volunteerChatUrl && (
                        <a
                          href={app.event.volunteerChatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                        >
                          Чат волонтёров →
                        </a>
                      )}
                      <Link
                        href={`/admin/registrations/${app.event.race.slug}/${app.event.year}/kit`}
                        className="rounded-[var(--radius-s)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                      >
                        Выдача наборов →
                      </Link>
                    </>
                  )}
                  {canReapply && (
                    <Link
                      href={`/volunteer/apply?eventId=${app.eventId}`}
                      className="rounded-[var(--radius-s)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                    >
                      Подать повторно →
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RegistrationHistory({ registrations }: { registrations: RegistrationRow[] }) {
  const t = useTranslations("Account");
  const tCommon = useTranslations("Common");
  const tStatus = useTranslations("RegistrationStatus");
  const tCert = useTranslations("Certificate");
  const format = useFormatter();

  return (
    <section className="flex flex-col gap-4">
      <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("historyTitle")}</div>
      {registrations.length === 0 ? (
        <p className="rounded-[var(--radius-m)] border border-dashed border-border p-6 text-center text-sm text-ink-faint">
          {t("historyEmpty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {registrations.map((reg) => (
            <li
              key={reg.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-m)] border border-border bg-surface p-4"
            >
              <div>
                <Link href={`/events/${reg.event.race.slug}/${reg.event.year}`} className="font-semibold text-ink hover:text-ember">
                  {reg.event.race.name} {reg.event.year}
                </Link>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {reg.distance ? `${reg.distance.name}${reg.distance.km > 0 ? ` · ${reg.distance.km} ${tCommon("km")}` : ""}` : "Трансфер"}
                  {reg.bibNumber && ` · №${reg.bibNumber}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">{tStatus(reg.status)}</span>
                <span className="text-xs text-ink-faint">{format.dateTime(reg.createdAt, { day: "numeric", month: "short", year: "numeric" })}</span>
                {reg.status === "PAID" && (
                  <Link
                    href={`/tickets/${reg.id}`}
                    className="text-xs font-semibold text-ember hover:underline"
                  >
                    {t("showQrCta")}
                  </Link>
                )}
                {reg.result && (
                  <Link
                    href={`/certificate/${reg.result.id}`}
                    className="text-xs font-semibold text-spruce hover:underline"
                  >
                    🏅 {tCert("downloadCta")}
                  </Link>
                )}
                {reg.status === "RESERVED" &&
                  !reg.kitPickedUpAt &&
                  new Date() <= new Date(reg.event.cancellationDeadline) && (
                    <CancelRegistrationButton registrationId={reg.id} />
                  )}
                {reg.status === "PAID" &&
                  new Date() <= new Date(reg.event.cancellationDeadline) &&
                  !reg.transferUsedAt &&
                  !(reg.kitPickedUpAt && !(reg.includesTransfer || reg.isTransferOnly)) && (
                    <RefundRequestButton
                      registrationId={reg.id}
                      hasTransfer={reg.includesTransfer || reg.isTransferOnly}
                      pendingTypes={reg.refundRequests.map((r) => r.type)}
                      slotLocked={!!reg.kitPickedUpAt}
                    />
                  )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
