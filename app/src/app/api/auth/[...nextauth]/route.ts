import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { googleOAuthCredentials, googleOAuthNotConfiguredResponse, isGoogleOAuthRequest } from "@/lib/googleOAuth";

function guarded(request: NextRequest, handler: (request: NextRequest) => Promise<Response>) {
  if (isGoogleOAuthRequest(request.nextUrl.pathname) && !googleOAuthCredentials()) {
    return googleOAuthNotConfiguredResponse();
  }
  return handler(request);
}

export function GET(request: NextRequest) {
  return guarded(request, handlers.GET);
}

export function POST(request: NextRequest) {
  return guarded(request, handlers.POST);
}
