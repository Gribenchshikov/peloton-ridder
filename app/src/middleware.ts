import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { contentSecurityPolicy, cspResponseHeaderName } from "./lib/csp";

const handleI18n = createMiddleware(routing);

function appendRequestOverride(response: NextResponse, name: string, value: string) {
  const current = response.headers.get("x-middleware-override-headers");
  const names = new Set((current ?? "").split(",").map((part) => part.trim()).filter(Boolean));
  names.add(name);
  response.headers.set("x-middleware-override-headers", [...names].join(","));
  response.headers.set(`x-middleware-request-${name}`, value);
}

export default function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const policy = contentSecurityPolicy({
    nonce,
    upgradeInsecureRequests: process.env.NODE_ENV === "production",
  });
  const response = handleI18n(request);
  response.headers.set(cspResponseHeaderName(), policy);
  appendRequestOverride(response, "x-nonce", nonce);
  appendRequestOverride(response, "content-security-policy", policy);
  return response;
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|media|.*\\..*).*)"],
};
