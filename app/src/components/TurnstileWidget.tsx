"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: { reset: (widgetId?: string) => void };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Токен Turnstile одноразовый — после неудачной отправки формы (любая ошибка, не только
// bot_check: сервер уже сходил в siteverify к этому моменту) виджет остаётся с "мёртвым"
// токеном, пока его не сбросить явно. Отслеживаем смену error и сбрасываем при каждой.
export function TurnstileWidget({ error }: { error?: string }) {
  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) {
      window.turnstile?.reset();
    }
    mounted.current = true;
  }, [error]);

  if (!SITE_KEY) {
    return null;
  }

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
      <div className="cf-turnstile" data-sitekey={SITE_KEY} />
    </>
  );
}
