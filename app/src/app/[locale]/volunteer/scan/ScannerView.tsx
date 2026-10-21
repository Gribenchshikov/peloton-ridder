"use client";

import { useEffect, useRef, useState, useCallback, FormEvent } from "react";
import jsQR from "jsqr";
import { TRANSFER_REFUNDED_BOARDING_MESSAGE } from "@/lib/registrationStatus";
import { parseKitLookupQuery } from "@/lib/ticketCode";

type ScanResult = {
  registrationId: string;
  status: string;
  bibNumber: number | null;
  kitPickedUpAt: string | null;
  transferUsedAt: string | null;
  includesTransfer: boolean;
  isTransferOnly: boolean;
  slotCancelled?: boolean;
  transferRefunded?: boolean;
  participant: {
    firstName: string;
    lastName: string;
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
  const cameraGenRef = useRef(0);
  const handleTokenRef = useRef<(token: string) => Promise<void>>(async () => {});

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [kitState, setKitState] = useState<ActionState>("idle");
  const [transferState, setTransferState] = useState<ActionState>("idle");

  const [manualQuery, setManualQuery] = useState("");
  const [manualEventId, setManualEventId] = useState(events[0]?.id ?? "");
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualLoading, setManualLoading] = useState(false);

  const stopCamera = useCallback(() => {
    cameraGenRef.current += 1;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleToken = useCallback(async (token: string) => {
    setScanning(false);
    stopCamera();
    setFetchError(null);
    setScanResult(null);
    setKitState("idle");
    setTransferState("idle");

    const res = await fetch(`/api/scan?token=${encodeURIComponent(token)}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setFetchError(body.error === "not_found" ? "Участник не найден" : "Ошибка при проверке QR");
      return;
    }
    const data: ScanResult = await res.json();
    setScanResult(data);
  }, [stopCamera]);
  handleTokenRef.current = handleToken;

  const startCamera = useCallback(async () => {
    const gen = ++cameraGenRef.current;
    const stillActive = () => gen === cameraGenRef.current;

    setScanResult(null);
    setFetchError(null);
    setKitState("idle");
    setTransferState("idle");
    setScanning(true);
    setCameraError(null);
    setManualQuery("");
    setManualError(null);

    const openStream = async () => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        return await navigator.mediaDevices.getUserMedia({ video: true });
      }
    };

    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (!stillActive()) return;

      let stream: MediaStream;
      try {
        stream = await openStream();
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        if (name !== "NotReadableError" && name !== "AbortError") throw error;
        await new Promise((resolve) => setTimeout(resolve, 350));
        if (!stillActive()) return;
        stream = await openStream();
      }
      if (!stillActive()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        try {
          await video.play();
        } catch {
          // Автозапуск без жеста может быть запрещён — поток уже идёт.
        }
      }
      if (!stillActive()) return;

      const tick = () => {
        if (!stillActive()) return;
        const currentVideo = videoRef.current;
        const canvas = canvasRef.current;
        if (!currentVideo || !canvas || currentVideo.readyState !== currentVideo.HAVE_ENOUGH_DATA) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        canvas.width = currentVideo.videoWidth;
        canvas.height = currentVideo.videoHeight;
        ctx.drawImage(currentVideo, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data.startsWith("RIDDER1.")) {
          void handleTokenRef.current(code.data);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      if (!stillActive()) return;
      setCameraError("Не удалось открыть камеру. Убедитесь, что сайт открыт по HTTPS и доступ к камере разрешён.");
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    void startCamera();
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
      const body = await res.json().catch(() => ({}));
      if (body.error === "transfer_refunded") {
        setScanResult((prev) =>
          prev ? { ...prev, transferRefunded: true, includesTransfer: false } : prev,
        );
        setTransferState("idle");
        return;
      }
      setTransferState("error");
    }
  };

  const handleManualLookup = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseKitLookupQuery(manualQuery);
    if (!parsed) {
      setManualError("Введите код с билета (ABC-DEF) или стартовый номер");
      return;
    }
    if (parsed.kind === "bib" && !manualEventId) {
      setManualError("Выберите забег — для поиска по стартовому номеру");
      return;
    }
    setManualLoading(true);
    setManualError(null);
    setScanResult(null);
    setFetchError(null);
    setKitState("idle");
    setTransferState("idle");
    stopCamera();
    setScanning(false);

    const params = new URLSearchParams({ q: manualQuery.trim() });
    if (manualEventId) params.set("eventId", manualEventId);
    const res = await fetch(`/api/scan/bib?${params.toString()}`);
    setManualLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setManualError(
        body.error === "not_found"
          ? "Участник не найден"
          : body.error === "invalid_bib"
            ? "Введите код с билета (ABC-DEF) или стартовый номер"
            : "Ошибка поиска",
      );
      return;
    }
    const data: ScanResult = await res.json();
    setScanResult(data);
  };

  const alreadyPickedUp = scanResult?.kitPickedUpAt != null;
  const alreadyBoarded = scanResult?.transferUsedAt != null;
  const transferRefunded = Boolean(scanResult?.transferRefunded);
  const notPaid = scanResult && scanResult.status !== "PAID" && !transferRefunded;
  const slotCancelled = Boolean(scanResult?.slotCancelled);
  const canIssueKit = Boolean(scanResult && !notPaid && !scanResult.isTransferOnly && !slotCancelled);
  const canShowBoarding = Boolean(scanResult?.includesTransfer && !transferRefunded);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-10">
      <h1 className="font-display text-xl font-bold text-ink">Выдача стартового набора</h1>
      <p className="mt-1 text-sm text-ink-soft">Направьте камеру на QR-код участника или билета на трансфер</p>

      {/* Camera view — video always mounted so the ref is ready on first open */}
      <div
        className={`relative mt-6 overflow-hidden rounded-[var(--radius-m)] border border-border bg-black ${
          scanning && !cameraError ? "" : "hidden"
        }`}
      >
        <video ref={videoRef} playsInline muted autoPlay className="w-full" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 rounded-lg border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
      </div>

      {cameraError && (
        <div className="mt-6 rounded-[var(--radius-m)] border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          <p>{cameraError}</p>
          <button
            type="button"
            onClick={() => void startCamera()}
            className="mt-3 text-sm font-semibold text-ember hover:underline"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {/* Hidden canvas for QR processing */}
      <canvas ref={canvasRef} className="hidden" />

      <form onSubmit={handleManualLookup} className="mt-6 flex flex-col gap-3 rounded-[var(--radius-m)] border border-border bg-surface p-4">
        <p className="text-sm font-semibold text-ink">Ввести код вручную</p>
        <p className="text-xs text-ink-soft">Код с билета (ABC-DEF) или стартовый номер</p>
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
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={12}
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value.toUpperCase())}
            placeholder="ABC-DEF или 42"
            className="flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 font-mono text-sm tracking-widest text-ink placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-faint focus:border-ember focus:outline-none"
          />
          <button
            type="submit"
            disabled={!manualQuery.trim() || manualLoading}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {manualLoading ? "…" : "Найти"}
          </button>
        </div>
        {manualError && <p className="text-sm text-danger">{manualError}</p>}
      </form>

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

          {alreadyPickedUp && !scanResult.isTransferOnly && (
            <div className="rounded-[var(--radius-m)] border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
              <p className="font-semibold text-amber-700 dark:text-amber-300">Набор уже выдан</p>
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                {new Intl.DateTimeFormat("ru", { dateStyle: "short", timeStyle: "short" }).format(
                  new Date(scanResult.kitPickedUpAt!)
                )}
              </p>
            </div>
          )}

          {scanResult.isTransferOnly && !transferRefunded && (
            <div className="rounded-[var(--radius-m)] border border-spruce/30 bg-spruce/5 p-4">
              <p className="font-semibold text-spruce">Билет на трансфер</p>
            </div>
          )}

          {transferRefunded && (
            <div className="rounded-[var(--radius-m)] border border-danger/30 bg-danger/5 p-4">
              <p className="font-semibold text-danger">{TRANSFER_REFUNDED_BOARDING_MESSAGE}</p>
              <p className="mt-0.5 text-xs text-danger/80">Посадка невозможна</p>
            </div>
          )}

          {/* Participant card */}
          <div className="rounded-[var(--radius-m)] border border-border bg-surface">
            {/* Bib header */}
            <div className="flex items-center gap-4 border-b border-border px-5 py-4">
              {scanResult.bibNumber != null ? (
                <span className="font-display text-5xl font-extrabold text-ember">
                  #{scanResult.bibNumber}
                </span>
              ) : scanResult.isTransferOnly ? (
                <span className="rounded-full bg-spruce/10 px-3 py-1 text-sm font-bold uppercase tracking-wide text-spruce">
                  Трансфер
                </span>
              ) : null}
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
          {slotCancelled && (
            <p className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-4 py-3 text-sm text-ink">
              Регистрация на слот отменена. Стартовый набор не выдаётся.
            </p>
          )}

          {(canIssueKit || canShowBoarding) && (
            <div className="flex flex-col gap-3">
              {/* Kit pickup */}
              {canIssueKit && (
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
              {canShowBoarding && (
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
