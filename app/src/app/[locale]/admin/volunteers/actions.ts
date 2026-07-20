"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";

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

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#E2531F;">Peloton Ridder</h2>
      <p><strong>Промокод:</strong> <code style="background:#f4f4f4;padding:2px 8px;border-radius:4px;font-size:1.1em;">${promoCode}</code></p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #eee;"/>
      <div style="margin-bottom:24px;">
        <p style="font-size:0.75em;color:#888;text-transform:uppercase;letter-spacing:.05em;">RU</p>
        <p style="white-space:pre-wrap;">${textRu}</p>
      </div>
      <div style="margin-bottom:24px;">
        <p style="font-size:0.75em;color:#888;text-transform:uppercase;letter-spacing:.05em;">KK</p>
        <p style="white-space:pre-wrap;">${textKk}</p>
      </div>
      <div>
        <p style="font-size:0.75em;color:#888;text-transform:uppercase;letter-spacing:.05em;">EN</p>
        <p style="white-space:pre-wrap;">${textEn}</p>
      </div>
    </div>
  `;

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@ridder.kz",
    to: user.email,
    subject: "Peloton Ridder — ваш промокод",
    html,
  });

  revalidatePath("/[locale]/admin/volunteers", "page");
  return { ok: true };
}
