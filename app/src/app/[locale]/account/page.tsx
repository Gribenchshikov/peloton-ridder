import { useTranslations, useFormatter } from "next-intl";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getUserProfile } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { ProfileForm } from "./ProfileForm";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { ChangeEmailForm } from "./ChangeEmailForm";
import { CancelRegistrationButton } from "./CancelRegistrationButton";
import { VolunteerProgress } from "./VolunteerProgress";
import { logoutAction } from "@/lib/authActions";

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: "/login", locale });
  }

  const [profile, thresholdSetting, tshirtGuideUrl] = await Promise.all([
    getUserProfile(session.user.id),
    prisma.siteSetting.findUnique({ where: { key: "volunteer_slots_threshold" } }),
    prisma.siteSetting.findUnique({ where: { key: "tshirt_size_guide_url" } }),
  ]);
  if (!profile) {
    return redirect({ href: "/login", locale });
  }

  const volunteerThreshold = Number(thresholdSetting?.value ?? 3);
  // Считаем только те, которые admin вручную зачислил (creditedAt != null)
  const completedVolunteerCount = profile.volunteerApplications.filter(
    (a) => a.creditedAt,
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <AccountHeader name={profile.firstName} isAdmin={profile.isAdmin} />
      <ProfileForm
        user={{
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          city: profile.city ?? "",
          phone: profile.phone ?? "",
          tshirtSize: profile.tshirtSize,
          birthDate: profile.birthDate,
        }}
        locale={locale}
        callbackUrl={callbackUrl}
        tshirtSizeGuideUrl={tshirtGuideUrl?.value}
      />
      <ChangeEmailForm currentEmail={profile.email} locale={locale} />
      <ChangePasswordForm />
      {(profile.isVolunteer || profile.isAdmin) && (
        <section>
          <h2 className="font-display text-lg font-bold text-ink">Инструменты волонтёра</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/volunteer/scan"
              className="rounded-[var(--radius-s)] border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              QR-сканер выдачи набора →
            </Link>
          </div>
        </section>
      )}
      {profile.isVolunteer && (
        <VolunteerProgress
          completed={completedVolunteerCount}
          threshold={volunteerThreshold}
        />
      )}
      {profile.volunteerApplications.length > 0 && (
        <VolunteerSection applications={profile.volunteerApplications} />
      )}
      <RegistrationHistory registrations={profile.registrations} />
    </main>
  );
}

function AccountHeader({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const t = useTranslations("Account");
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("eyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("title", { name })}</h1>
      </div>
      <div className="flex items-center gap-3">
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
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-ink">Волонтёрство</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {applications.map((app) => {
          const s = VOLUNTEER_STATUS_STYLES[app.status] ?? VOLUNTEER_STATUS_STYLES.PENDING;
          const borderColor =
            app.status === "APPROVED"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30"
              : app.status === "REJECTED"
              ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20"
              : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20";
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
                {app.status === "APPROVED" && (
                  <div className="flex flex-wrap gap-2">
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
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RegistrationHistory({ registrations }: { registrations: RegistrationRow[] }) {
  const t = useTranslations("Account");
  const tCommon = useTranslations("Common");
  const tStatus = useTranslations("RegistrationStatus");
  const format = useFormatter();

  return (
    <section>
      <h2 className="font-display text-lg font-bold text-ink">{t("historyTitle")}</h2>
      {registrations.length === 0 ? (
        <p className="mt-3 rounded-[var(--radius-m)] border border-dashed border-border p-6 text-center text-sm text-ink-faint">
          {t("historyEmpty")}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
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
                  {reg.distance.name} · {reg.distance.km} {tCommon("km")}
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
                {(reg.status === "RESERVED" || reg.status === "PAID") &&
                  !reg.kitPickedUpAt &&
                  new Date() <= new Date(reg.event.cancellationDeadline) && (
                    <CancelRegistrationButton registrationId={reg.id} />
                  )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
