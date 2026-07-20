import { requireAdminPage } from "@/lib/session";
import { AdminView } from "./AdminView";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale);

  return <AdminView />;
}
