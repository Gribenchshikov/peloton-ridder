import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getEventForRegistration, getActiveRegistration, getUserContactInfo } from "@/lib/queries";
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

  const [existing, profile] = await Promise.all([
    getActiveRegistration(session.user.id, event.id),
    getUserContactInfo(session.user.id),
  ]);
  if (existing) {
    return redirect({ href: `/pay/${existing.id}`, locale });
  }
  if (!profile) {
    return redirect({ href: "/login", locale });
  }

  return <RegisterView event={event} profile={profile} locale={locale} callbackPath={`/events/${slug}/${year}/register`} />;
}
