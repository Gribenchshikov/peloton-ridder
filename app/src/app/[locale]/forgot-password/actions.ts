"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createVerificationToken } from "@/lib/verification-token";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { buildAppUrl } from "@/lib/url";

const ForgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export type ForgotPasswordState = {
  error?: string;
  success?: boolean;
};

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = ForgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "invalid" };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Намеренно не раскрываем, есть ли аккаунт с таким email — тот же принцип, что и в логине:
  // ответ пользователю одинаковый независимо от того, найден ли аккаунт.
  if (user) {
    const token = await createVerificationToken(user.email, "PASSWORD_RESET");
    await sendPasswordResetEmail(user.email, buildAppUrl(`/reset-password?token=${token}`));
  }

  return { success: true };
}
