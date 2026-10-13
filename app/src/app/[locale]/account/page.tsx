import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getUserProfile, getSeriesWithRaces, getUserSeriesProgress } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { ProfileForm } from "./ProfileForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { VolunteerProgress } from "./VolunteerProgress";
import { ClubSection } from "./ClubSection";
import { SeriesMedals } from "./SeriesMedals";
import { StravaSection } from "./StravaSection";
import { VolunteerSection } from "./VolunteerSection";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold uppercase tracking-widest text-ink-faint">{children}</div>;
}

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
  const completedVolunteerCount = profile.volunteerApplications.filter((a) => a.creditedAt).length;
  const hasVolunteerBlock =
    profile.isVolunteer || profile.isAdmin || profile.volunteerApplications.length > 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
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

      <div className="flex flex-col gap-4 border-t border-border pt-10">
        <SectionLabel>Беговой клуб</SectionLabel>
        <ClubSection
          currentClub={profile.runningClub}
          latestRequest={profile.clubRequests[0] ?? null}
          clubs={clubs}
        />
      </div>

      <StravaSection
        stravaAthleteId={profile.stravaAthleteId}
        stravaAthleteName={profile.stravaAthleteName}
        status={stravaStatus}
      />

      {hasVolunteerBlock && (
        <div className="flex flex-col gap-6 border-t border-border pt-10">
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

      {seriesProgress && seriesProgress.seriesRaces.length > 0 && (
        <div className="border-t border-border pt-10">
          <SeriesMedals progress={seriesProgress} year={currentYear} />
        </div>
      )}
    </div>
  );
}
