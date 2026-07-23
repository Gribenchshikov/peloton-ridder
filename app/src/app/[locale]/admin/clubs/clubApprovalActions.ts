"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function approveClubRequestAction(
  requestId: string,
  clubName: string,
): Promise<{ error?: string; ok?: boolean }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const req = await prisma.clubMembershipRequest.findUnique({
    where: { id: requestId },
    select: { userId: true, status: true, clubName: true },
  });
  if (!req) return { error: "not_found" };
  if (req.status !== "PENDING") return { error: "not_pending" };

  const name = (clubName ?? "").trim() || req.clubName;

  await prisma.$transaction(async (tx) => {
    const club = await tx.runningClub.create({ data: { name } });
    await tx.clubMembershipRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", runningClubId: club.id },
    });
    await tx.user.update({
      where: { id: req.userId },
      data: { runningClubId: club.id },
    });
  });

  revalidatePath("/[locale]/admin/clubs", "page");
  revalidatePath("/[locale]/account", "page");
  return { ok: true };
}

export async function rejectClubRequestAction(
  requestId: string,
  adminNote: string,
): Promise<{ error?: string; ok?: boolean }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  await prisma.clubMembershipRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", adminNote: adminNote.trim() || null },
  });

  revalidatePath("/[locale]/admin/clubs", "page");
  return { ok: true };
}
