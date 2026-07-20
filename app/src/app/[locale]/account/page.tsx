import { useTranslations, useFormatter } from "next-intl";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getUserProfile } from "@/lib/queries";
import { Link } from "@/i18n/navigation";
import { ProfileForm } from "./ProfileForm";
import { CancelRegistrationButton } from "./CancelRegistrationButton";
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

  const profile = await getUserProfile(session.user.id);
  if (!profile) {
    return redirect({ href: "/login", locale });
  }

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
        }}
        locale={locale}
        callbackUrl={callbackUrl}
      />
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
                {(reg.status === "RESERVED" || reg.status === "PAID") &&
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
