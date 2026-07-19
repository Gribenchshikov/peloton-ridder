import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { EditMemberView } from "./EditMemberView";

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  await requireAdminPage(locale);

  const member = await prisma.teamMember.findUnique({ where: { id } });
  if (!member) notFound();

  return <EditMemberView locale={locale} member={member} />;
}
