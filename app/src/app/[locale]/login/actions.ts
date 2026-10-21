"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { googleOAuthCredentials } from "@/lib/googleOAuth";
import { safeRelativePath } from "@/lib/safeRedirect";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export type LoginState = {
  error?: string;
};

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const ip = clientIp(await headers());
  if (!rateLimit(`login:${ip}:${email}`, 10, 15 * 60 * 1000) || !rateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000)) {
    return { error: "invalid_credentials" };
  }
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeRelativePath(formData.get("callbackUrl")) ?? "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "invalid_credentials" };
    }
    throw error;
  }
}

export async function googleSignInAction(): Promise<LoginState> {
  if (!googleOAuthCredentials()) return { error: "google_not_configured" };
  await signIn("google", { redirectTo: "/" });
  return {};
}
