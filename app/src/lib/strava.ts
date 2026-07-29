export interface StravaRawActivity {
  id: number;
  type: string;
  distance: number;        // метры
  moving_time: number;     // секунды
  elapsed_time: number;    // секунды
  average_speed: number;   // м/с
  start_date: string;      // ISO
  map: { summary_polyline: string | null } | null;
}

export async function refreshStravaToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_at: number;
} | null> {
  try {
    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ access_token: string; refresh_token: string; expires_at: number }>;
  } catch {
    return null;
  }
}

export async function fetchStravaActivities(
  accessToken: string,
  after: Date,
  before: Date,
): Promise<StravaRawActivity[]> {
  const params = new URLSearchParams({
    after: String(Math.floor(after.getTime() / 1000)),
    before: String(Math.floor(before.getTime() / 1000)),
    per_page: "200",
  });
  const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava activities fetch failed: ${res.status}`);
  return res.json() as Promise<StravaRawActivity[]>;
}

export function getStravaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    approval_prompt: "auto",
    scope: "activity:read_all",
    state,
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: { id: number; firstname: string; lastname: string };
}

export async function exchangeStravaCode(code: string): Promise<StravaTokenResponse> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  return res.json() as Promise<StravaTokenResponse>;
}
