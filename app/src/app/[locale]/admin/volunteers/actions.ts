"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function reviewVolunteerAction(
  applicationId: string,
  decision: "APPROVED" | "REJECTED"
): Promise<{ ok?: boolean; error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const app = await prisma.volunteerApplication.findUnique({
    where: { id: applicationId },
    select: { status: true, userId: true },
  });
  if (!app) return { error: "not_found" };
  if (app.status !== "PENDING") return { error: "already_reviewed" };

  await prisma.volunteerApplication.update({
    where: { id: applicationId },
    data: { status: decision, reviewedById: adminId, reviewedAt: new Date() },
  });

  if (decision === "APPROVED") {
    await prisma.user.update({
      where: { id: app.userId },
      data: { isVolunteer: true },
    });
  }

  revalidatePath("/admin/volunteers");
  return { ok: true };
}
