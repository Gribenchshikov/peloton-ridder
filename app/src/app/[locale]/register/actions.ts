"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordFieldSchema } from "@/lib/password";
import { createVerificationToken } from "@/lib/verification-token";
import { sendVerificationEmail, sendAdminAlertEmail } from "@/lib/mailer";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { buildAppUrl } from "@/lib/url";
import { isDisposableEmail } from "@/lib/disposable-email-domains";

const LATIN_NAME = /^[A-Za-z][A-Za-z \-]*$/;

const RegisterSchema = z
  .object({
    firstName: z.string().trim().min(2).max(100).regex(LATIN_NAME, "latin_only"),
    lastName: z.string().trim().min(2).max(100).regex(LATIN_NAME, "latin_only"),
    email: z.string().trim().toLowerCase().email(),
    phone: z.string().trim().max(30).optional(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    password: passwordFieldSchema,
    confirmPassword: z.string(),
    city: z.string().trim().max(100).optional(),
    country: z.string().trim().length(3).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "password_mismatch",
    path: ["confirmPassword"],
  });

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  country: string;
  phone: string;
  birthDate: string;
};

export type RegisterState = {
  error?: string;
  success?: boolean;
  values?: FormValues;
};

export async function registerAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const values: FormValues = {
    firstName: (formData.get("firstName") as string) ?? "",
    lastName: (formData.get("lastName") as string) ?? "",
    email: (formData.get("email") as string) ?? "",
    city: (formData.get("city") as string) ?? "",
    country: (formData.get("country") as string) ?? "",
    phone: (formData.get("phone") as string) ?? "",
    birthDate: (formData.get("birthDate") as string) ?? "",
  };

  const parsed = RegisterSchema.safeParse({
    ...values,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    city: values.city || undefined,
    country: values.country || undefined,
    phone: values.phone || undefined,
    birthDate: values.birthDate || undefined,
  });

  if (!parsed.success) {
    const isMismatch = parsed.error.issues.some((i) => i.message === "password_mismatch");
    if (isMismatch) return { error: "password_mismatch", values };
    const isLatinOnly = parsed.error.issues.some((i) => i.message === "latin_only");
    if (isLatinOnly) return { error: "name_latin_only", values };
    const isWeakPassword = parsed.error.issues.some((i) => i.message === "password_no_letter" || i.message === "password_no_digit");
    if (isWeakPassword) return { error: "password_weak", values };
    return { error: "invalid", values };
  }

  const { firstName, lastName, email, phone, birthDate, password, city, country } = parsed.data;

  const [turnstileOk, existing] = await Promise.all([
    verifyTurnstileToken(formData.get("cf-turnstile-response") as string | null),
    prisma.user.findUnique({ where: { email } }),
  ]);
  if (!turnstileOk) {
    return { error: "bot_check", values };
  }
  if (existing) {
    return { error: "email_taken", values };
  }
  if (isDisposableEmail(email)) {
    return { error: "disposable_email", values };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { firstName, lastName, email, passwordHash, city, country: country ?? null, phone, birthDate: birthDate ? new Date(birthDate) : undefined },
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
