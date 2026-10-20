import { auth } from "@/auth";
import { Link, redirect } from "@/i18n/navigation";
import { getUserProfile } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { VolunteerProgress } from "../VolunteerProgress";
import { VolunteerSection } from "../VolunteerSection";

export default async function AccountVolunteerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: "/login", locale });
  }

  const [profile, thresholdSetting] = await Promise.all([
    getUserProfile(session.user.id),
    prisma.siteSetting.findUnique({ where: { key: "volunteer_slots_threshold" } }),
  ]);
  if (!profile) {
    return redirect({ href: "/login", locale });
  }
  if (!profile.isVolunteer) {
    return redirect({ href: "/account", locale });
  }

  const volunteerThreshold = Number(thresholdSetting?.value ?? 3);
  const completedVolunteerCount = profile.volunteerApplications.filter((a) => a.creditedAt).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <Link
          href="/volunteer/scan"
          className="rounded-[var(--radius-s)] border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          QR-сканер выдачи набора →
        </Link>
      </div>
      <VolunteerProgress
        completed={completedVolunteerCount}
        threshold={volunteerThreshold}
        rewardClaimedAt={profile.volunteerRewardClaimedAt}
        savedPromoCode={profile.volunteerPromoCode}
      />
      {profile.volunteerApplications.length > 0 && (
        <VolunteerSection applications={profile.volunteerApplications} />
      )}
    </div>
  );
}
