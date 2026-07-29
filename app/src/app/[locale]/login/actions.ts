"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { safeRelativePath } from "@/lib/safeRedirect";

export type LoginState = {
  error?: string;
};

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeRelativePath(formData.get("callbackUrl")) ?? "/",
    });
    return {};
  } catch (error) {
    // signIn() бросает NEXT_REDIRECT при успехе (это нормально, пробрасываем дальше) —
    // ошибка от неверных данных приходит как AuthError, её и обрабатываем.
    if (error instanceof AuthError) {
      return { error: "invalid_credentials" };
    }
    throw error;
  }
}
