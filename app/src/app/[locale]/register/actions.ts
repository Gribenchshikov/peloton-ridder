"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordFieldSchema } from "@/lib/password";
import { createVerificationToken } from "@/lib/verification-token";
import { sendVerificationEmail, sendAdminAlertEmail } from "@/lib/mailer";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { buildAppUrl } from "@/lib/url";

const RegisterSchema = z
  .object({
    firstName: z.string().trim().min(2).max(100),
    lastName: z.string().trim().min(2).max(100),
    email: z.string().trim().toLowerCase().email(),
    phone: z.string().trim().max(30).optional(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    password: passwordFieldSchema,
    confirmPassword: z.string(),
    city: z.string().trim().max(100).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "password_mismatch",
    path: ["confirmPassword"],
  });

export type RegisterState = {
  error?: string;
  success?: boolean;
};

export async function registerAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = RegisterSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    birthDate: formData.get("birthDate") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    city: formData.get("city") || undefined,
  });

  if (!parsed.success) {
    const isMismatch = parsed.error.issues.some((i) => i.message === "password_mismatch");
    return { error: isMismatch ? "password_mismatch" : "invalid" };
  }

  const { firstName, lastName, email, phone, birthDate, password, city } = parsed.data;

  const [turnstileOk, existing] = await Promise.all([
    verifyTurnstileToken(formData.get("cf-turnstile-response") as string | null),
    prisma.user.findUnique({ where: { email } }),
  ]);
  if (!turnstileOk) {
    return { error: "bot_check" };
  }
  if (existing) {
    return { error: "email_taken" };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { firstName, lastName, email, passwordHash, city, phone, birthDate: birthDate ? new Date(birthDate) : undefined },
  });

  const token = await createVerificationToken(email);
  const adminEmails = (
    await prisma.user.findMany({ where: { isAdmin: true }, select: { email: true } })
  ).map((u) => u.email);

  await Promise.all([
    sendVerificationEmail(email, buildAppUrl(`/verify?token=${token}`)),
    sendAdminAlertEmail(adminEmails, "Регистрация нового пользователя", `${firstName} ${lastName} <${email}>`, "система", new Date()),
  ]);

  return { success: true };
}
