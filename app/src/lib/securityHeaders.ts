/**
 * Заголовки ответа Next.js. Nginx их не дублирует.
 * HSTS с includeSubDomains и preload остаётся как был у приложения на
 * test.peloton-ridder.kz. На apex peloton-ridder.kz этот конфиг не публикуется:
 * это другой сайт, и includeSubDomains туда отдельно не включается.
 * COOP same-origin-allow-popups: оплата Kaspi открывается через window.open.
 */
export const securityHeaders: { key: string; value: string }[] = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];
