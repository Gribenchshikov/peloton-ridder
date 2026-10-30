/**
 * CSP для страниц Next.js. По умолчанию заголовок Report-Only: браузер пишет
 * нарушения в консоль и ничего не блокирует. CSP_ENFORCE=true включает блокировку.
 *
 * script-src без unsafe-inline и unsafe-eval. nonce закрывает скрипты Next.js.
 * strict-dynamic намеренно нет: виджет Turnstile подключается отдельным script src,
 * и strict-dynamic отключил бы разрешение по хосту.
 * style-src содержит unsafe-inline, потому что nonce не действует на style=""
 * у React и Tailwind. Это не разрешение для скриптов.
 */

const SCRIPT_HOSTS = ["https://challenges.cloudflare.com"];
const IMG_HOSTS = [
  "https://api.maptiler.com",
  "https://tile.openstreetmap.org",
  "https://*.tile.openstreetmap.org",
  "https://api.apipay.kz",
  "https://sandbox.apipay.kz",
  "https://static.tildacdn.pro",
  "https://*.googleusercontent.com",
];
const CONNECT_HOSTS = [
  "https://api.maptiler.com",
  "https://challenges.cloudflare.com",
  "https://accounts.google.com",
  "https://oauth2.googleapis.com",
  "https://openidconnect.googleapis.com",
  "https://www.googleapis.com",
  "https://api.apipay.kz",
  "https://sandbox.apipay.kz",
  "https://www.strava.com",
];
const FRAME_HOSTS = ["https://challenges.cloudflare.com", "https://accounts.google.com"];

type CspEnv = {
  [key: string]: string | undefined;
  UPLOAD_URL?: string;
  CSP_ENFORCE?: string;
};

function uploadOrigin(env: CspEnv): string | null {
  const raw = env.UPLOAD_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy(options: {
  nonce: string;
  upgradeInsecureRequests: boolean;
  env?: CspEnv;
}): string {
  const env = options.env ?? process.env;
  const images = [...IMG_HOSTS];
  const uploads = uploadOrigin(env);
  if (uploads && !images.includes(uploads)) images.push(uploads);
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${options.nonce}' ${SCRIPT_HOSTS.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${images.join(" ")}`,
    "font-src 'self' data: https:",
    `connect-src 'self' ${CONNECT_HOSTS.join(" ")}`,
    `frame-src 'self' ${FRAME_HOSTS.join(" ")}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    "frame-ancestors 'self'",
  ];
  if (options.upgradeInsecureRequests) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function cspUsesEnforcement(env: CspEnv = process.env): boolean {
  return env.CSP_ENFORCE === "true";
}

export function cspResponseHeaderName(env: CspEnv = process.env): string {
  return cspUsesEnforcement(env) ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}
