"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export const TURNSTILE_ENABLED = Boolean(SITE_KEY);

type Status = "loading" | "checking" | "passed" | "error";

export function TurnstileWidget({
  error,
  onReadyChange,
}: {
  error?: string;
  onReadyChange?: (ready: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const onReadyChangeRef = useRef(onReadyChange);
  onReadyChangeRef.current = onReadyChange;

  function renderWidget() {
    if (!containerRef.current || !window.turnstile || !SITE_KEY) return;
    if (widgetIdRef.current !== null) return; // already rendered

    setStatus("checking");

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: () => {
        setStatus("passed");
        onReadyChangeRef.current?.(true);
      },
      "error-callback": () => {
        setStatus("error");
        onReadyChangeRef.current?.(false);
      },
      "expired-callback": () => {
        setStatus("checking");
        onReadyChangeRef.current?.(false);
      },
    });
  }

  // If the script already loaded before the component mounted (e.g. HMR), render immediately.
  useEffect(() => {
    if (window.turnstile) renderWidget();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset after each server-side error — token was consumed by the server's siteverify call.
  const firstError = useRef(true);
  useEffect(() => {
    if (firstError.current) { firstError.current = false; return; }
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setStatus("checking");
      onReadyChangeRef.current?.(false);
    }
  }, [error]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
      />
      <div className="flex flex-col gap-1">
        <div ref={containerRef} />
        {status === "loading" && (
          <p className="text-xs text-ink-faint">Загружаем проверку...</p>
        )}
        {status === "checking" && (
          <p className="text-xs text-ink-faint">Проверяем...</p>
        )}
        {status === "error" && (
          <p className="text-xs text-danger">Проверка не прошла — попробуйте ещё раз.</p>
        )}
      </div>
    </>
  );
}
