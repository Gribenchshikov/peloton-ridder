import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getEventForRegistration, getActiveRegistration, getUserContactInfo } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { RegisterView } from "./RegisterView";

export default async function EventRegisterPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; year: string }>;
}) {
  const { locale, slug, year } = await params;

  const [session, event] = await Promise.all([auth(), getEventForRegistration(slug, Number(year))]);

  if (!session?.user?.id) {
    return redirect({
      href: { pathname: "/login", query: { callbackUrl: `/events/${slug}/${year}/register` } },
      locale,
    });
  }
  if (!event) notFound();

  if (event.status !== "OPEN" || event.registrationDeadline < new Date()) {
    return redirect({ href: `/events/${slug}/${year}`, locale });
  }

  const [existing, profile, clubs] = await Promise.all([
    getActiveRegistration(session.user.id, event.id),
    getUserContactInfo(session.user.id),
    prisma.runningClub.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, city: true } }),
  ]);
  if (existing) {
    return redirect({ href: `/pay/${existing.id}`, locale });
  }
  if (!profile) {
    return redirect({ href: "/login", locale });
  }
  if (!profile.emailVerified) {
    return <EmailConfirmationRequired email={profile.email} />;
  }

  return <RegisterView event={event} profile={profile} locale={locale} clubs={clubs} callbackPath={`/events/${slug}/${year}/register`} />;
}

function EmailConfirmationRequired({ email }: { email: string }) {
  const t = useTranslations("Registration");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <section className="rounded-[var(--radius-m)] border border-warn bg-warn-tint p-6">
        <span className="text-xs font-bold uppercase tracking-wide text-warn">{t("eyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">{t("emailVerificationTitle")}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">{t("emailVerificationText", { email })}</p>
      </section>
    </main>
  );
}
