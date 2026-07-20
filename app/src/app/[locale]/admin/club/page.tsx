import { requireAdminPage } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ClubView } from "./ClubView";

export default async function AdminClubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireAdminPage(locale);

  const [members, trainingGroups] = await Promise.all([
    prisma.teamMember.findMany({ orderBy: [{ type: "asc" }, { order: "asc" }] }),
    prisma.trainingGroup.findMany({ orderBy: { order: "asc" } }),
  ]);

  return <ClubView members={members} trainingGroups={trainingGroups} />;
}
