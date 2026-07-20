"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { lookupTransferAction, markTransferUsedAction } from "./actions";

type RegInfo = {
  registrationId: string;
  name: string;
  distance: string;
  race: string;
  bibNumber: number | null;
  transferUsedAt: Date | null;
};

type ScanState =
  | { phase: "scanning" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "info"; reg: RegInfo }
  | { phase: "used"; reg: RegInfo; usedAt: Date };

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ScanState>({ phase: "scanning" });
  const [isPending, startTransition] = useTransition();
  const scanningRef = useRef(true);

  useEffect(() => {
    let controls: { stop: () => void } | null = null;
    let mounted = true;

    async function startScanner() {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();

      if (!videoRef.current || !mounted) return;

      try {
        controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, error) => {
            if (!result || !scanningRef.current) return;
            const text = result.getText();
            if (!text.startsWith("RIDDER:")) return;
            const registrationId = text.slice("RIDDER:".length);
            if (!registrationId) return;

            scanningRef.current = false;
            setState({ phase: "loading" });

            startTransition(async () => {
              const res = await lookupTransferAction(registrationId);
              if (!mounted) return;
              if (res.kind === "error") {
                setState({ phase: "error", message: res.message });
                return;
              }
              if (res.transferUsedAt) {
                setState({ phase: "used", reg: res, usedAt: new Date(res.transferUsedAt) });
              } else {
                setState({ phase: "info", reg: res });
              }
            });
          }
        );
      } catch (e) {
        if (mounted) {
          setState({ phase: "error", message: "Не удалось получить доступ к камере. Проверьте разрешения браузера." });
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      scanningRef.current = false;
      controls?.stop();
    };
  }, []);

  function reset() {
    scanningRef.current = true;
    setState({ phase: "scanning" });
  }

  async function handleMark(registrationId: string) {
    startTransition(async () => {
      const res = await markTransferUsedAction(registrationId);
      if ("error" in res) {
        if (res.error === "already_used") {
          setState((s) =>
            s.phase === "info"
              ? { phase: "used", reg: s.reg, usedAt: new Date() }
              : s
          );
        } else {
          setState({ phase: "error", message: res.error });
        }
        return;
      }
      setState((s) =>
        s.phase === "info"
          ? { phase: "used", reg: s.reg, usedAt: res.usedAt }
          : s
      );
    });
  }

  const isScanning = state.phase === "scanning" || state.phase === "loading";

  return (
    <div className="flex flex-col gap-6">
      {/* Camera viewfinder — always mounted, hidden when showing result */}
      <div className={`relative overflow-hidden rounded-[var(--radius-m)] bg-black ${isScanning ? "block" : "hidden"}`}>
        <video
          ref={videoRef}
          className="h-72 w-full object-cover"
          playsInline
          muted
        />
        {/* Scan reticle */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 rounded-lg border-2 border-white/60" />
        </div>
        {state.phase === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-sm font-semibold text-white">Загрузка…</p>
          </div>
        )}
        <p className="absolute bottom-3 left-0 right-0 text-center text-xs font-semibold text-white/80">
          Наведите камеру на QR-код участника
        </p>
      </div>

      {/* Error state */}
      {state.phase === "error" && (
        <div className="rounded-[var(--radius-m)] border border-danger/30 bg-danger/5 p-5">
          <p className="font-semibold text-danger">{state.message}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-2"
          >
            Сканировать снова
          </button>
        </div>
      )}

      {/* Info / confirm state */}
      {state.phase === "info" && (
        <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-ink">{state.reg.name}</p>
              {state.reg.bibNumber && (
                <p className="mt-0.5 font-mono text-2xl font-bold text-ember">#{state.reg.bibNumber}</p>
              )}
            </div>
            <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-success">Оплачено</span>
          </div>
          <div className="mb-5 flex flex-col gap-1.5 text-sm text-ink-soft">
            <p>{state.reg.race}</p>
            <p>{state.reg.distance}</p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleMark(state.reg.registrationId)}
            className="w-full rounded-[var(--radius-s)] bg-ember px-5 py-3 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Отмечаем…" : "Отметить посадку ✓"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="mt-2 w-full rounded-[var(--radius-s)] border border-border px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
          >
            Назад
          </button>
        </div>
      )}

      {/* Already used */}
      {state.phase === "used" && (
        <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
          <p className="text-lg font-bold text-ink">{state.reg.name}</p>
          {state.reg.bibNumber && (
            <p className="mt-0.5 font-mono text-2xl font-bold text-ember">#{state.reg.bibNumber}</p>
          )}
          <div className="mt-4 rounded-[var(--radius-s)] border border-warning/30 bg-warning/5 p-3 text-sm font-semibold text-warning">
            Посадка уже отмечена — {new Intl.DateTimeFormat("ru", { timeStyle: "short" }).format(state.usedAt)}
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-4 w-full rounded-[var(--radius-s)] border border-border px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2"
          >
            Сканировать следующего
          </button>
        </div>
      )}
    </div>
  );
}
