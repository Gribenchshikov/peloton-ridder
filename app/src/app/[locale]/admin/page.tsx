import { requireAdminPage } from "@/lib/session";
import { getAdminEvents } from "@/lib/queries";
import { AdminView } from "./AdminView";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale);

  const events = await getAdminEvents();

  return <AdminView events={events} />;
}
