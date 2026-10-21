/** Auth.js читает AUTH_GOOGLE_ID динамически. Пустая строка для него заданное значение и уходит в Google как client_id=. */

type EnvLike = Record<string, string | undefined>;

function envValue(env: EnvLike, name: string) {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
}

export function googleOAuthCredentials(env: EnvLike = process.env) {
  const clientId = envValue(env, "AUTH_GOOGLE_ID");
  const clientSecret = envValue(env, "AUTH_GOOGLE_SECRET");
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function googleProviderOptions(env: EnvLike = process.env) {
  const credentials = googleOAuthCredentials(env);
  return {
    ...(credentials ?? {}),
    checks: ["pkce", "state"] as ("pkce" | "state")[],
    authorization: { params: { prompt: "select_account" } },
  };
}

export function isGoogleOAuthRequest(pathname: string) {
  return pathname.endsWith("/signin/google") || pathname.endsWith("/callback/google");
}

export function googleOAuthNotConfiguredResponse() {
  return Response.json({ error: "google_not_configured" }, { status: 500 });
}
