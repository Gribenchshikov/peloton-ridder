import { requireAdminPage } from "@/lib/session";
import { NewMemberView } from "./NewMemberView";

export default async function NewMemberPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale);
  return <NewMemberView locale={locale} />;
}
