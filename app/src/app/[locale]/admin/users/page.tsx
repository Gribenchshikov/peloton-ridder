import { requireAdminPage } from "@/lib/session";
import { getUsersForAdmin } from "@/lib/queries";
import { auth } from "@/auth";
import { UsersView } from "./UsersView";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/users");

  const [users, session] = await Promise.all([getUsersForAdmin(), auth()]);
  return <UsersView users={users} currentUserId={session?.user?.id} />;
}
