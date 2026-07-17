"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = {
  error?: string;
};

// Только относительные пути внутри приложения — "/foo", не "//evil.com" или абсолютный URL.
// (Auth.js сам по умолчанию тоже ограничивает redirect тем же origin, это доп. явная проверка.)
function safeCallbackUrl(value: FormDataEntryValue | null): string {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/account";
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
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
