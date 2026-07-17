import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { getEventForRegistration, getActiveRegistration } from "@/lib/queries";
import { RegisterView } from "./RegisterView";

export default async function EventRegisterPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; year: string }>;
}) {
  const { locale, slug, year } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({
      href: { pathname: "/login", query: { callbackUrl: `/events/${slug}/${year}/register` } },
      locale,
    });
  }

  const event = await getEventForRegistration(slug, Number(year));
  if (!event) notFound();

  if (event.status !== "OPEN" || event.registrationDeadline < new Date()) {
    return redirect({ href: `/events/${slug}/${year}`, locale });
  }

  const existing = await getActiveRegistration(session.user.id, event.id);
  if (existing) {
    return redirect({ href: `/pay/${existing.id}`, locale });
  }

  return <RegisterView event={event} locale={locale} />;
}
