import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { exchangeStravaCode } from "@/lib/strava";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const base = process.env.APP_URL ?? "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${base}/account?strava=denied`);
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("strava_oauth_state")?.value;
  cookieStore.delete("strava_oauth_state");

  if (!state || state !== expectedState) {
    return NextResponse.redirect(`${base}/account?strava=error`);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(`${base}/login`);
  }

  try {
    const data = await exchangeStravaCode(code);
    // Strava возвращает scope в ответе — проверяем что activity:read_all выдан
    const grantedScope: string = ((data as unknown) as Record<string, unknown>).scope as string ?? "";
    if (!grantedScope.includes("activity:read_all") && !grantedScope.includes("activity:read")) {
      console.warn("[strava callback] insufficient scope:", grantedScope);
      return NextResponse.redirect(`${base}/account?strava=scope_error&scope=${encodeURIComponent(grantedScope)}`);
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        stravaAthleteId: String(data.athlete.id),
        stravaAthleteName: `${data.athlete.firstname} ${data.athlete.lastname}`.trim(),
        stravaAccessToken: data.access_token,
        stravaRefreshToken: data.refresh_token,
        stravaTokenExpiresAt: new Date(data.expires_at * 1000),
      },
    });
    return NextResponse.redirect(`${base}/account?strava=connected`);
  } catch {
    return NextResponse.redirect(`${base}/account?strava=error`);
  }
}
