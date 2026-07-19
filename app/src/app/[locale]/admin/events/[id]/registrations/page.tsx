import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/session";
import { getEventWithRegistrations } from "@/lib/queries";
import { RegistrationsView } from "./RegistrationsView";

export default async function RegistrationsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireAdminPage(locale, `/admin/events/${id}/registrations`);

  const event = await getEventWithRegistrations(id);
  if (!event) notFound();

  return <RegistrationsView event={event} />;
}
