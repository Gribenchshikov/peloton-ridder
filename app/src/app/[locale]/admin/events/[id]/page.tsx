import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/session";
import { getEventForAdmin } from "@/lib/queries";
import { EventEditView } from "./EventEditView";

export default async function EditEventPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  await requireAdminPage(locale, `/admin/events/${id}`);

  const event = await getEventForAdmin(id);
  if (!event) notFound();

  return <EventEditView event={event} />;
}
