import { requireAdminPage } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ClubView } from "./ClubView";

export default async function AdminClubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale);

  const members = await prisma.teamMember.findMany({ orderBy: [{ type: "asc" }, { order: "asc" }] });

  return <ClubView members={members} />;
}
