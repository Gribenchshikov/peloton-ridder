"use server";

import { verifySync } from "otplib";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { sendAdminAlertEmail } from "@/lib/mailer";
import { revalidatePath } from "next/cache";

type UserActionType = "toggleAdmin" | "ban" | "unban" | "freeze" | "unfreeze" | "forceReset" | "edit";

export async function updateUserAction(
  userId: string,
  action: UserActionType,
  data: Record<string, unknown>,
  twoFaCode?: string,
) {
  const currentAdminId = await requireAdminId();
  if (!currentAdminId) return { error: "unauthorized" };

  const currentAdmin = await prisma.user.findUnique({
    where: { id: currentAdminId },
    select: { email: true, firstName: true, lastName: true, totpSecret: true },
  });
  if (!currentAdmin) return { error: "unauthorized" };

  if (!currentAdmin.totpSecret) return { error: "no_2fa" };

  const code = (twoFaCode ?? "").trim();
  const result = verifySync({ token: code, secret: currentAdmin.totpSecret });
  if (!result.valid) return { error: "invalid_2fa_code" };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!target) return { error: "not_found" };

  const adminEmails = (
    await prisma.user.findMany({ where: { isAdmin: true }, select: { email: true } })
  ).map((u) => u.email);

  const actorLabel = `${currentAdmin.firstName} ${currentAdmin.lastName} <${currentAdmin.email}>`;
  const targetLabel = `${target.firstName} ${target.lastName} <${target.email}>`;

  if (action === "toggleAdmin") {
    const makeAdmin = data.makeAdmin as boolean | undefined;
    if (makeAdmin === false && userId === currentAdminId) {
      return { error: "cannot_demote_self" };
    }
    await prisma.user.update({ where: { id: userId }, data: { isAdmin: makeAdmin } });
    const eventLabel = makeAdmin ? "Выдача роли администратора" : "Снятие роли администратора";
    await sendAdminAlertEmail(adminEmails, eventLabel, targetLabel, actorLabel, new Date());
  }

  if (action === "ban") {
    const days = Number(data.banDays);
    if (!days || days <= 0) return { error: "invalid_ban_days" };
    const bannedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: userId }, data: { bannedUntil } });
    await sendAdminAlertEmail(adminEmails, `Бан пользователя на ${days} дн.`, targetLabel, actorLabel, new Date());
  }

  if (action === "unban") {
    await prisma.user.update({ where: { id: userId }, data: { bannedUntil: null } });
    await sendAdminAlertEmail(adminEmails, "Снятие бана пользователя", targetLabel, actorLabel, new Date());
  }

  if (action === "freeze") {
    await prisma.user.update({ where: { id: userId }, data: { isFrozen: true } });
    await sendAdminAlertEmail(adminEmails, "Заморозка аккаунта (навсегда)", targetLabel, actorLabel, new Date());
  }

  if (action === "unfreeze") {
    await prisma.user.update({ where: { id: userId }, data: { isFrozen: false } });
    await sendAdminAlertEmail(adminEmails, "Разморозка аккаунта", targetLabel, actorLabel, new Date());
  }

  if (action === "forceReset") {
    await prisma.user.update({ where: { id: userId }, data: { passwordChangedAt: new Date() } });
    await sendAdminAlertEmail(adminEmails, "Принудительный сброс пароля", targetLabel, actorLabel, new Date());
  }

  if (action === "edit") {
    const firstName = String(data.firstName ?? "").trim();
    const lastName = String(data.lastName ?? "").trim();
    const email = String(data.email ?? "").trim().toLowerCase();
    if (!firstName || !lastName || !email) return { error: "invalid_edit_payload" };
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { firstName, lastName, email, emailVerified: null, passwordChangedAt: new Date() },
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
    await sendAdminAlertEmail(adminEmails, "Редактирование данных пользователя", targetLabel, actorLabel, new Date());
  }

  revalidatePath("/admin/users");
  return { ok: true };
}
