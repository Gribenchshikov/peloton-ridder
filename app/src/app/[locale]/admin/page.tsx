import { requireAdminPage } from "@/lib/session";
import { getHomeEvents } from "@/lib/queries";
import { AdminView } from "./AdminView";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale);

  const events = await getHomeEvents();

  return <AdminView events={events} />;
}
