"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { revalidatePath } from "next/cache";

type UserActionType = "toggleAdmin" | "ban" | "unban" | "forceReset" | "edit";

export async function updateUserAction(
  userId: string,
  action: UserActionType,
  data: Record<string, unknown>,
  twoFaCode?: string,
) {
  const currentAdminId = await requireAdminId();
  if (!currentAdminId) return { error: "unauthorized" };

  if (twoFaCode !== "123456") {
    return { error: "invalid_2fa_code" };
  }

  if (action === "toggleAdmin") {
    const makeAdmin = data.makeAdmin as boolean | undefined;
    if (makeAdmin === false && userId === currentAdminId) {
      return { error: "cannot_demote_self" };
    }
    await prisma.user.update({ where: { id: userId }, data: { isAdmin: makeAdmin } });
  }

  if (action === "ban") {
    const days = Number(data.banDays);
    if (!days || days <= 0) {
      return { error: "invalid_ban_days" };
    }
    await prisma.user.update({
      where: { id: userId },
      data: { bannedUntil: new Date(Date.now() + days * 24 * 60 * 60 * 1000) },
    });
  }

  if (action === "unban") {
    await prisma.user.update({
      where: { id: userId },
      data: { bannedUntil: null },
    });
  }

  if (action === "forceReset") {
    await prisma.user.update({
      where: { id: userId },
      data: { passwordChangedAt: new Date() },
    });
  }

  if (action === "edit") {
    const firstName = String(data.firstName ?? "").trim();
    const lastName = String(data.lastName ?? "").trim();
    const email = String(data.email ?? "").trim().toLowerCase();
    if (!firstName || !lastName || !email) {
      return { error: "invalid_edit_payload" };
    }
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          firstName,
          lastName,
          email,
          emailVerified: null,
          passwordChangedAt: new Date(),
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2002"
      ) {
        return { error: "email_taken" };
      }
      throw error;
    }
  }

  revalidatePath("/admin/users");
  return { ok: true };
}
