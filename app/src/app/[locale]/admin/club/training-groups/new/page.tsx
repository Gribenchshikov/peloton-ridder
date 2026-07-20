import { requireAdminPage } from "@/lib/session";
import { NewTrainingGroupView } from "./NewTrainingGroupView";

export default async function NewTrainingGroupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale);
  return <NewTrainingGroupView locale={locale} />;
}
