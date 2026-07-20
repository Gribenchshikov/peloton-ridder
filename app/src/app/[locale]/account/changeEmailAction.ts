"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { requireUserId } from "@/lib/session";
import { createEmailChangeToken } from "@/lib/verification-token";
import { sendEmailChangeEmail } from "@/lib/mailer";

const Schema = z.object({
  newEmail: z.string().email(),
  currentPassword: z.string().min(1),
});

export type ChangeEmailState = { error?: string; success?: boolean };

export async function changeEmailAction(
  _prev: ChangeEmailState,
  formData: FormData,
): Promise<ChangeEmailState> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthorized" };

  const parsed = Schema.safeParse({
    newEmail: formData.get("newEmail"),
    currentPassword: formData.get("currentPassword"),
  });
  if (!parsed.success) return { error: "invalid" };

  const { newEmail, currentPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });
  if (!user) return { error: "unauthorized" };

  if (user.email.toLowerCase() === newEmail.toLowerCase()) return { error: "same_email" };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return { error: "wrong_password" };

  const taken = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
  if (taken) return { error: "email_taken" };

  const token = await createEmailChangeToken(userId, newEmail);
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  await sendEmailChangeEmail(newEmail, `${appUrl}/ru/verify-email-change?token=${token}`);

  return { success: true };
}
