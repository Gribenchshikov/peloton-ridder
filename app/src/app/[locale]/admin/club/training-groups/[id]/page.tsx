import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EditTrainingGroupView } from "./EditTrainingGroupView";

export default async function EditTrainingGroupPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireAdminPage(locale);

  const group = await prisma.trainingGroup.findUnique({ where: { id } });
  if (!group) notFound();

  return <EditTrainingGroupView locale={locale} group={group} />;
}
