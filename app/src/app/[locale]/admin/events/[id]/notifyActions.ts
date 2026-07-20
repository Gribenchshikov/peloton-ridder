"use server";

import { z } from "zod";
import { requireAdminId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { sendBroadcastEmail } from "@/lib/mailer";

const Schema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(10).max(10000),
});

export type NotifyState = { error?: string; count?: number };

export async function sendNotificationAction(
  eventId: string,
  _prev: NotifyState,
  formData: FormData,
): Promise<NotifyState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = Schema.safeParse({
    subject: formData.get("subject"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: "invalid" };
  const { subject, body } = parsed.data;

  const registrations = await prisma.registration.findMany({
    where: { eventId, status: "PAID" },
    select: { user: { select: { email: true, firstName: true } } },
  });

  await Promise.all(
    registrations.map((r) =>
      sendBroadcastEmail(r.user.email, r.user.firstName, subject, body)
    )
  );

  await prisma.notification.create({
    data: { eventId, subject, body, sentById: adminId },
  });

  return { count: registrations.length };
}
