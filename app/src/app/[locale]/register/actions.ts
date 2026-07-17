"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createVerificationToken } from "@/lib/verification-token";
import { sendVerificationEmail } from "@/lib/mailer";
import { verifyTurnstileToken } from "@/lib/turnstile";

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  // bcrypt игнорирует всё после 72 байт — длиннее не имеет смысла разрешать.
  password: z.string().min(8).max(72),
  city: z.string().trim().max(100).optional(),
});

export type RegisterState = {
  error?: string;
  success?: boolean;
};

export async function registerAction(_prevState: RegisterState, formData: FormData): Promise<RegisterState> {
  const parsed = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    city: formData.get("city") || undefined,
  });

  if (!parsed.success) {
    return { error: "invalid" };
  }

  const { name, email, password, city } = parsed.data;

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
    data: { name, email, passwordHash, city },
  });

  const token = await createVerificationToken(email);
  const verifyUrl = `${process.env.APP_URL ?? "http://localhost:3000"}/verify?token=${token}`;
  await sendVerificationEmail(email, verifyUrl);

  return { success: true };
}
