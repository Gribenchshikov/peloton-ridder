import { requireAdminPage } from "@/lib/session";
import { getRacesForAdmin } from "@/lib/queries";
import { NewEventView } from "./NewEventView";

export default async function NewEventPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/events/new");

  const races = await getRacesForAdmin();

  return <NewEventView locale={locale} races={races} />;
}
