"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function toggleAdminAction(userId: string, makeAdmin: boolean) {
  const currentAdminId = await requireAdminId();
  if (!currentAdminId) return { error: "unauthorized" };

  // Нельзя снять права с себя
  if (!makeAdmin && userId === currentAdminId) {
    return { error: "cannot_demote_self" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isAdmin: makeAdmin },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
