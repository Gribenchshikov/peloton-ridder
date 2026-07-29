function isConfigured() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

// Пока Turnstile не подключён (нет TURNSTILE_SECRET_KEY) — пропускаем проверку, как и с
// email/Kaspi (см. mailer.ts, kaspi.ts): на этой стадии проекта нет боевой конфигурации,
// блокировать регистрацию из-за этого не нужно. Виджет на фронтенде тоже не рендерится
// без NEXT_PUBLIC_TURNSTILE_SITE_KEY — так что fail-open тут симметричен на обоих концах.
// В отличие от email/Kaspi это именно защитный механизм, поэтому если fail-open сработал
// в реальном проде (а не при локальной проверке прод-сборки), это стоит громко залогировать —
// иначе забытый на деплое TURNSTILE_SECRET_KEY молча выключит защиту от ботов.
export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  if (!isConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error("[turnstile] TURNSTILE_SECRET_KEY не задан — проверка на бота отключена.");
    }
    return true;
  }
  if (!token) {
    return false;
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY!,
      response: token,
    }),
  });

  const data: { success: boolean; "error-codes"?: string[] } = await res.json();
  if (!data.success) {
    console.error("[turnstile] verification failed:", data["error-codes"]);
  }
  return data.success === true;
}
