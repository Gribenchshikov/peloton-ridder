"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordFieldSchema } from "@/lib/password";
import { consumeVerificationToken } from "@/lib/verification-token";

const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordFieldSchema,
});

export type ResetPasswordState = {
  error?: string;
  success?: boolean;
};

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = ResetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const isWeak = parsed.error.issues.some((i) => i.message === "password_no_letter" || i.message === "password_no_digit");
    return { error: isWeak ? "password_weak" : "invalid" };
  }

  const email = await consumeVerificationToken(parsed.data.token, "PASSWORD_RESET");
  if (!email) {
    return { error: "expired" };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  // passwordChangedAt инвалидирует уже выданные JWT-сессии этого пользователя (см. auth.ts).
  await prisma.user.update({ where: { email }, data: { passwordHash, passwordChangedAt: new Date() } });

  return { success: true };
}
