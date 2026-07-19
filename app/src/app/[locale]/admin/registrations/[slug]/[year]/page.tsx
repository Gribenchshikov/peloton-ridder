import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/session";
import { getEventWithRegistrationsBySlug } from "@/lib/queries";
import { RegistrationsView } from "@/app/[locale]/admin/events/[id]/registrations/RegistrationsView";

export default async function RegistrationsBySlugPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; year: string }>;
}) {
  const { locale, slug, year } = await params;
  await requireAdminPage(locale, `/admin/registrations/${slug}/${year}`);

  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) notFound();

  const event = await getEventWithRegistrationsBySlug(slug, yearNum);
  if (!event) notFound();

  return <RegistrationsView event={event} />;
}
