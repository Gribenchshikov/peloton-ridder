"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { sendVolunteerRewardEmail, sendVolunteerStatusEmail } from "@/lib/mailer";

export async function reviewVolunteerAction(
  applicationId: string,
  decision: "APPROVED" | "REJECTED"
): Promise<{ ok?: boolean; error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const app = await prisma.volunteerApplication.findUnique({
    where: { id: applicationId },
    select: {
      status: true,
      userId: true,
      event: {
        select: {
          year: true,
          volunteerChatUrl: true,
          race: { select: { name: true } },
        },
      },
      user: { select: { email: true, firstName: true, lastName: true } },
    },
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

  const raceName = `${app.event.race.name} ${app.event.year}`;
  const userName = `${app.user.firstName} ${app.user.lastName}`.trim();
  sendVolunteerStatusEmail(app.user.email, userName, raceName, decision, app.event.volunteerChatUrl).catch(
    (e) => console.error("[volunteers] email error:", e)
  );

  revalidatePath("/[locale]/admin/volunteers", "page");
  return { ok: true };
}

export async function revokeVolunteerAction(
  applicationId: string
): Promise<{ ok?: boolean; error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const app = await prisma.volunteerApplication.findUnique({
    where: { id: applicationId },
    select: { userId: true, status: true },
  });
  if (!app) return { error: "not_found" };
  if (app.status !== "APPROVED") return { error: "not_approved" };

  await prisma.volunteerApplication.update({
    where: { id: applicationId },
    data: { status: "REJECTED", creditedAt: null, reviewedById: adminId, reviewedAt: new Date() },
  });

  const otherApproved = await prisma.volunteerApplication.count({
    where: { userId: app.userId, status: "APPROVED", id: { not: applicationId } },
  });
  if (otherApproved === 0) {
    await prisma.user.update({
      where: { id: app.userId },
      data: { isVolunteer: false },
    });
  }

  revalidatePath("/[locale]/admin/volunteers", "page");
  return { ok: true };
}

// Зачислить/снять зачёт для конкретного события у волонтёра
export async function toggleVolunteerCreditAction(
  applicationId: string,
  credit: boolean
): Promise<{ ok?: boolean; error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  await prisma.volunteerApplication.update({
    where: { id: applicationId },
    data: { creditedAt: credit ? new Date() : null },
  });

  revalidatePath("/[locale]/admin/volunteers", "page");
  return { ok: true };
}

// Сбросить весь прогресс волонтёра (снять все зачёты + сбросить rewardClaimedAt)
export async function resetVolunteerProgressAction(
  userId: string
): Promise<{ ok?: boolean; error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  await prisma.volunteerApplication.updateMany({
    where: { userId, status: "APPROVED" },
    data: { creditedAt: null },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { volunteerRewardClaimedAt: null },
  });

  revalidatePath("/[locale]/admin/volunteers", "page");
  return { ok: true };
}

// Рассылка в Telegram-канал волонтёров
export async function sendVolunteerBroadcastAction(
  message: string
): Promise<{ ok?: boolean; error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };
  if (!message.trim()) return { error: "empty" };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.VOLUNTEER_TG_CHAT_ID;
  if (!token || !chatId) return { error: "not_configured" };

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message.trim(), parse_mode: "HTML" }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("Telegram sendMessage error", body);
    return { error: "telegram_error" };
  }

  return { ok: true };
}

// Отправить письмо волонтёру с промокодом
export async function sendVolunteerRewardEmailAction(
  userId: string,
  textRu: string,
  textKk: string,
  textEn: string,
  promoCode: string
): Promise<{ ok?: boolean; error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!user) return { error: "not_found" };

  const sent = await sendVolunteerRewardEmail(user.email, textRu, textKk, textEn, promoCode);
  if (!sent) return { error: "smtp_error" };

  revalidatePath("/[locale]/admin/volunteers", "page");
  return { ok: true };
}
