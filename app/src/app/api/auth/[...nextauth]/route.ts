import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { googleOAuthCredentials, googleOAuthNotConfiguredResponse, isGoogleOAuthRequest } from "@/lib/googleOAuth";
import { normalizeLoginEmail } from "@/lib/loginThrottle";
import { loginLockedResponse, readLoginLock } from "@/lib/loginThrottleStore";
import { clientIp } from "@/lib/rateLimit";

function isCredentialsPost(request: NextRequest) {
  if (request.method !== "POST") return false;
  return /\/(?:callback|signin)\/credentials\/?$/.test(request.nextUrl.pathname);
}

async function credentialsLockResponse(request: NextRequest): Promise<Response | null> {
  if (!isCredentialsPost(request)) return null;
  const form = await request.clone().formData().catch(() => null);
  const email = normalizeLoginEmail(form?.get("email"));
  const lock = await readLoginLock(clientIp(request.headers), email);
  if (!lock.locked) return null;
  return loginLockedResponse(lock.retryAfterSeconds);
}

function guarded(request: NextRequest, handler: (request: NextRequest) => Promise<Response>) {
  if (isGoogleOAuthRequest(request.nextUrl.pathname) && !googleOAuthCredentials()) {
    return googleOAuthNotConfiguredResponse();
  }
  return handler(request);
}

export function GET(request: NextRequest) {
  return guarded(request, handlers.GET);
}

export async function POST(request: NextRequest) {
  if (isGoogleOAuthRequest(request.nextUrl.pathname) && !googleOAuthCredentials()) {
    return googleOAuthNotConfiguredResponse();
  }
  try {
    const locked = await credentialsLockResponse(request);
    if (locked) return locked;
  } catch (error) {
    console.error("[login] throttle read failed");
    void error;
    return new Response(JSON.stringify({ error: "unavailable" }), {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
  return handlers.POST(request);
}
