"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { sendAdminAlertEmail } from "@/lib/mailer";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

type ApplyState = { error?: string; success?: boolean };

export async function applyVolunteerAction(
  _prevState: ApplyState,
  formData: FormData
): Promise<ApplyState> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthorized" };

  const eventId = (formData.get("eventId") as string | null)?.trim() ?? "";
  const motivation = (formData.get("motivation") as string | null)?.trim() ?? "";
  const experience = (formData.get("experience") as string | null)?.trim() ?? "";
  const stravaUrl = (formData.get("stravaUrl") as string | null)?.trim() || null;

  if (!eventId) return { error: "no_event" };
  if (motivation.length < 10) return { error: "motivation_too_short" };
  if (experience.length < 10) return { error: "experience_too_short" };

  if (stravaUrl && !/^https?:\/\//i.test(stravaUrl)) {
    return { error: "strava_invalid_url" };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, year: true, race: { select: { name: true } } },
  });
  if (!event) return { error: "event_not_found" };

  const existing = await prisma.volunteerApplication.findFirst({
    where: { userId, eventId },
  });
  if (existing) return { error: "already_applied" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, email: true },
  });
  if (!user) return { error: "unauthorized" };

  await prisma.volunteerApplication.create({
    data: { userId, eventId, motivation, experience, stravaUrl, availability: "" },
  });

  const adminEmails = (
    await prisma.user.findMany({ where: { isAdmin: true }, select: { email: true } })
  ).map((u) => u.email);

  await sendAdminAlertEmail(
    adminEmails,
    `Новая заявка волонтёра — ${event.race.name} ${event.year}`,
    `${user.firstName} ${user.lastName} <${user.email}>`,
    "система",
    new Date()
  );

  const locale = await getLocale();
  redirect({ href: "/account", locale });
  return { success: true };
}
