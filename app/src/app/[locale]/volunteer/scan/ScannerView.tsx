"use client";

import { useEffect, useRef, useState, useCallback, FormEvent } from "react";
import jsQR from "jsqr";

type ScanResult = {
  registrationId: string;
  status: string;
  bibNumber: number | null;
  kitPickedUpAt: string | null;
  transferUsedAt: string | null;
  includesTransfer: boolean;
  isTransferOnly: boolean;
  participant: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    tshirtSize: string | null;
  };
  event: string;
  distance: string;
  merch: { name: string; size: string | null }[];
};

type ActionState = "idle" | "loading" | "done" | "error";

type EventOption = { id: string; label: string };

export function ScannerView({ events }: { events: EventOption[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [kitState, setKitState] = useState<ActionState>("idle");
  const [transferState, setTransferState] = useState<ActionState>("idle");

  const [manualBib, setManualBib] = useState("");
  const [manualEventId, setManualEventId] = useState(events[0]?.id ?? "");
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const handleToken = useCallback(async (token: string) => {
    setScanning(false);
    stopCamera();
    setFetchError(null);
    setScanResult(null);

    const res = await fetch(`/api/scan?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setFetchError(body.error === "not_found" ? "Участник не найден" : "Ошибка при проверке QR");
      return;
    }
    const data: ScanResult = await res.json();
    setScanResult(data);
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setScanResult(null);
    setFetchError(null);
    setKitState("idle");
    setTransferState("idle");
    setScanning(true);
    setCameraError(null);
    setManualBib("");
    setManualError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const tick = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data.startsWith("RIDDER:")) {
          handleToken(code.data);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setCameraError("Не удалось открыть камеру. Убедитесь, что сайт открыт по HTTPS и доступ к камере разрешён.");
      setScanning(false);
    }
  }, [handleToken]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const confirmPickup = async () => {
    if (!scanResult) return;
    setKitState("loading");
    const res = await fetch("/api/scan/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: scanResult.registrationId }),
    });
    if (res.ok) {
      setKitState("done");
    } else {
      setKitState("error");
    }
  };

  const confirmTransfer = async () => {
    if (!scanResult) return;
    setTransferState("loading");
    const res = await fetch("/api/scan/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registrationId: scanResult.registrationId }),
    });
    if (res.ok) {
      setTransferState("done");
    } else {
      setTransferState("error");
    }
  };

  const handleManualLookup = async (e: FormEvent) => {
    e.preventDefault();
    if (!manualBib || !manualEventId) return;
    setManualLoading(true);
    setManualError(null);
    setScanResult(null);
    setFetchError(null);
    setKitState("idle");
    setTransferState("idle");
    stopCamera();
    setScanning(false);

    const res = await fetch(`/api/scan/bib?bibNumber=${encodeURIComponent(manualBib)}&eventId=${encodeURIComponent(manualEventId)}`);
    setManualLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setManualError(body.error === "not_found" ? "Участник с таким номером не найден" : "Ошибка поиска");
      return;
    }
    const data: ScanResult = await res.json();
    setScanResult(data);
  };

  const alreadyPickedUp = scanResult?.kitPickedUpAt != null;
  const alreadyBoarded = scanResult?.transferUsedAt != null;
  const notPaid = scanResult && scanResult.status !== "PAID";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10">
      <h1 className="font-display text-xl font-bold text-ink">Выдача стартового набора</h1>
      <p className="mt-1 text-sm text-ink-soft">Направьте камеру на QR-код участника</p>

      {/* Camera view */}
      {scanning && !cameraError && (
        <div className="relative mt-6 overflow-hidden rounded-[var(--radius-m)] border border-border bg-black">
          <video ref={videoRef} playsInline muted className="w-full" />
          {/* Targeting reticle */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-48 w-48 rounded-lg border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        </div>
      )}

      {cameraError && (
        <div className="mt-6 rounded-[var(--radius-m)] border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          {cameraError}
        </div>
      )}

      {/* Hidden canvas for QR processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Manual bib number lookup */}
      {events.length > 0 && (
        <form onSubmit={handleManualLookup} className="mt-6 flex flex-col gap-3 rounded-[var(--radius-m)] border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-ink">Ввести номер вручную</p>
          {events.length > 1 && (
            <select
              value={manualEventId}
              onChange={(e) => setManualEventId(e.target.value)}
              className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.label}</option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={manualBib}
              onChange={(e) => setManualBib(e.target.value)}
              placeholder="Стартовый номер"
              className="flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
            />
            <button
              type="submit"
              disabled={!manualBib || !manualEventId || manualLoading}
              className="rounded-[var(--radius-s)] bg-ember px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {manualLoading ? "…" : "Найти"}
            </button>
          </div>
          {manualError && <p className="text-sm text-danger">{manualError}</p>}
        </form>
      )}

      {fetchError && (
        <div className="mt-6 rounded-[var(--radius-m)] border border-danger/30 bg-danger/5 p-4">
          <p className="font-semibold text-danger">{fetchError}</p>
          <button onClick={startCamera} className="mt-3 text-sm font-semibold text-ember hover:underline">
            ← Сканировать снова
          </button>
        </div>
      )}

      {/* Result card */}
      {scanResult && (
        <div className="mt-6 flex flex-col gap-4">
          {/* Status banner */}
          {notPaid && (
            <div className="rounded-[var(--radius-m)] border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
              <p className="font-semibold text-amber-700 dark:text-amber-300">Регистрация не оплачена</p>
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">Статус: {scanResult.status}</p>
            </div>
          )}

          {alreadyPickedUp && (
            <div className="rounded-[var(--radius-m)] border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
              <p className="font-semibold text-amber-700 dark:text-amber-300">Набор уже выдан</p>
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                {new Intl.DateTimeFormat("ru", { dateStyle: "short", timeStyle: "short" }).format(
                  new Date(scanResult.kitPickedUpAt!)
                )}
              </p>
            </div>
          )}

          {/* Participant card */}
          <div className="rounded-[var(--radius-m)] border border-border bg-surface">
            {/* Bib header */}
            <div className="flex items-center gap-4 border-b border-border px-5 py-4">
              <span className="font-display text-5xl font-extrabold text-ember">
                #{scanResult.bibNumber ?? "—"}
              </span>
              <div>
                <p className="font-display text-lg font-bold text-ink">
                  {scanResult.participant.firstName} {scanResult.participant.lastName}
                </p>
                <p className="text-sm text-ink-soft">{scanResult.event}</p>
              </div>
            </div>

            {/* Details */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4 text-sm">
              <div>
                <dt className="text-xs text-ink-faint">Дистанция</dt>
                <dd className="mt-0.5 font-semibold text-ink">{scanResult.distance}</dd>
              </div>
              {scanResult.participant.phone && (
                <div>
                  <dt className="text-xs text-ink-faint">Телефон</dt>
                  <dd className="mt-0.5 font-semibold text-ink">{scanResult.participant.phone}</dd>
                </div>
              )}
              {scanResult.participant.tshirtSize && (
                <div>
                  <dt className="text-xs text-ink-faint">Размер (профиль)</dt>
                  <dd className="mt-0.5 font-semibold text-ink">{scanResult.participant.tshirtSize}</dd>
                </div>
              )}
              {scanResult.merch.map((m, i) => (
                <div key={i}>
                  <dt className="text-xs text-ink-faint">{m.name}</dt>
                  <dd className="mt-0.5 font-semibold text-ink">{m.size ?? "—"}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Actions */}
          {!notPaid && (
            <div className="flex flex-col gap-3">
              {/* Kit pickup */}
              {!scanResult.isTransferOnly && (
                <>
                  {kitState === "done" ? (
                    <div className="rounded-[var(--radius-m)] border border-spruce/30 bg-spruce/5 p-4 text-center">
                      <p className="font-bold text-spruce">Набор выдан ✓</p>
                    </div>
                  ) : (
                    <>
                      {kitState === "error" && (
                        <p className="text-sm text-danger">Ошибка при сохранении. Попробуйте ещё раз.</p>
                      )}
                      <button
                        onClick={confirmPickup}
                        disabled={kitState === "loading"}
                        className="rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
                      >
                        {kitState === "loading"
                          ? "Сохраняем..."
                          : alreadyPickedUp
                          ? "Набор уже выдан — отметить повторно"
                          : "Выдать стартовый набор ✓"}
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Transfer boarding */}
              {scanResult.includesTransfer && (
                <>
                  {transferState === "done" ? (
                    <div className="rounded-[var(--radius-m)] border border-spruce/30 bg-spruce/5 p-4 text-center">
                      <p className="font-bold text-spruce">Посадка отмечена 🚌</p>
                    </div>
                  ) : (
                    <>
                      {alreadyBoarded && transferState === "idle" && (
                        <div className="rounded-[var(--radius-m)] border border-amber-300 bg-amber-50 px-4 py-2.5 dark:border-amber-700 dark:bg-amber-950/30">
                          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                            Посадка уже отмечена —{" "}
                            {new Intl.DateTimeFormat("ru", { timeStyle: "short" }).format(
                              new Date(scanResult.transferUsedAt!)
                            )}
                          </p>
                        </div>
                      )}
                      {transferState === "error" && (
                        <p className="text-sm text-danger">Ошибка при сохранении. Попробуйте ещё раз.</p>
                      )}
                      <button
                        onClick={confirmTransfer}
                        disabled={transferState === "loading"}
                        className="rounded-[var(--radius-s)] border border-spruce bg-spruce/5 px-5 py-3 text-sm font-bold text-spruce transition-colors hover:bg-spruce/10 disabled:opacity-60"
                      >
                        {transferState === "loading"
                          ? "Сохраняем..."
                          : alreadyBoarded
                          ? "Отметить посадку повторно 🚌"
                          : "Отметить посадку 🚌"}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          <button
            onClick={startCamera}
            className="rounded-[var(--radius-s)] border border-border px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            ← Следующий участник
          </button>
        </div>
      )}
    </main>
  );
}
