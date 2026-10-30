"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { googleOAuthCredentials } from "@/lib/googleOAuth";
import { safeRelativePath } from "@/lib/safeRedirect";
import { clientIp } from "@/lib/rateLimit";
import { normalizeLoginEmail } from "@/lib/loginThrottle";
import { readLoginLock } from "@/lib/loginThrottleStore";

export type LoginState = {
  error?: string;
};

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeLoginEmail(formData.get("email"));
  const ip = clientIp(await headers());
  try {
    if ((await readLoginLock(ip, email)).locked) return { error: "rate_limited" };
  } catch (error) {
    console.error("[login] throttle read failed");
    void error;
    return { error: "rate_limited" };
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
