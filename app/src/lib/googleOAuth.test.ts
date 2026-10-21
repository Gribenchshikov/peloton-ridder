import assert from "node:assert/strict";
import { test } from "node:test";
import { Auth } from "@auth/core";
import Google from "@auth/core/providers/google";
import { authorizeCredentials } from "../auth";
import {
  googleOAuthCredentials,
  googleOAuthNotConfiguredResponse,
  googleProviderOptions,
  isGoogleOAuthRequest,
} from "./googleOAuth";

const discovery = {
  issuer: "https://accounts.google.com",
  authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  token_endpoint: "https://oauth2.googleapis.com/token",
  userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
  jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
  response_types_supported: ["code"],
  subject_types_supported: ["public"],
  id_token_signing_alg_values_supported: ["RS256"],
  scopes_supported: ["openid", "email", "profile"],
  code_challenge_methods_supported: ["S256"],
  grant_types_supported: ["authorization_code"],
};

function requestUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return input.url;
  return String(input);
}

test("an empty Google client id is a configuration error and does not redirect", async () => {
  assert.equal(googleOAuthCredentials({}), null);
  assert.equal(googleOAuthCredentials({ AUTH_GOOGLE_ID: "", AUTH_GOOGLE_SECRET: "secret" }), null);
  assert.equal(googleOAuthCredentials({ AUTH_GOOGLE_ID: "   ", AUTH_GOOGLE_SECRET: "secret" }), null);
  assert.equal(isGoogleOAuthRequest("/api/auth/signin/google"), true);

  const response = googleOAuthNotConfiguredResponse();
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("location"), null);
  assert.deepEqual(await response.json(), { error: "google_not_configured" });
});

test("the Google authorization URL contains the client id, redirect, scope, state and PKCE", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = requestUrl(input);
    if (url === "https://accounts.google.com/.well-known/openid-configuration") {
      return new Response(JSON.stringify(discovery), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error(`unexpected request ${url}`);
  };

  try {
    const env = { AUTH_GOOGLE_ID: "test-client-id", AUTH_GOOGLE_SECRET: "test-client-secret" };
    const config = {
      providers: [Google(googleProviderOptions(env))],
      secret: "test-secret-value-32chars-minimum",
      trustHost: true,
      basePath: "/api/auth",
    };
    const csrf = await Auth(new Request("http://localhost:3000/api/auth/csrf"), config);
    const { csrfToken } = (await csrf.json()) as { csrfToken: string };
    const cookie = (csrf.headers.get("set-cookie") ?? "").split(";")[0];
    const response = await Auth(
      new Request("http://localhost:3000/api/auth/signin/google", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", cookie },
        body: new URLSearchParams({ csrfToken, callbackUrl: "http://localhost:3000/" }),
      }),
      config,
    );
    assert.equal(response.status, 302);
    const location = new URL(response.headers.get("location") ?? "");
    assert.equal(location.origin + location.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(location.searchParams.get("client_id"), "test-client-id");
    assert.equal(location.searchParams.get("redirect_uri"), "http://localhost:3000/api/auth/callback/google");
    assert.equal(location.searchParams.get("response_type"), "code");
    assert.match(location.searchParams.get("scope") ?? "", /\bopenid\b/);
    assert.ok(location.searchParams.get("state"));
    assert.ok(location.searchParams.get("code_challenge"));
    assert.equal(location.searchParams.get("code_challenge_method"), "S256");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("credentials login still rejects a request before checking a password", async () => {
  assert.equal(await authorizeCredentials(undefined), null);
  assert.equal(await authorizeCredentials({ email: "user@example.com" }), null);
  assert.equal(await authorizeCredentials({ password: "secret" }), null);
});
