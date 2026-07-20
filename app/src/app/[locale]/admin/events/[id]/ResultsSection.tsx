"use client";

import { useState, useTransition } from "react";
import { importResultsCsvAction, fetchMyraceResultsAction, clearResultsAction } from "../actions";
import type { Result } from "@/generated/prisma/client";

type Props = {
  eventId: string;
  initialResults: Result[];
};

export function ResultsSection({ eventId, initialResults }: Props) {
  const [results, setResults] = useState<Result[]>(initialResults);
  const [csvStatus, setCsvStatus] = useState<{ error?: string; success?: boolean; count?: number }>({});
  const [myraceStatus, setMyraceStatus] = useState<{ error?: string; success?: boolean; count?: number }>({});
  const [clearStatus, setClearStatus] = useState<{ error?: string; success?: boolean }>({});
  const [myraceUrl, setMyraceUrl] = useState("");
  const [csvPending, startCsv] = useTransition();
  const [myracePending, startMyrace] = useTransition();
  const [clearPending, startClear] = useTransition();

  function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    setCsvStatus({});
    startCsv(async () => {
      const result = await importResultsCsvAction(eventId, {}, fd);
      setCsvStatus(result);
      if (result.success) window.location.reload();
    });
    e.target.value = "";
  }

  function handleMyrace(e: React.FormEvent) {
    e.preventDefault();
    if (!myraceUrl) return;
    const fd = new FormData();
    fd.set("url", myraceUrl);
    setMyraceStatus({});
    startMyrace(async () => {
      const result = await fetchMyraceResultsAction(eventId, {}, fd);
      setMyraceStatus(result);
      if (result.success) window.location.reload();
    });
  }

  function handleClear() {
    const fd = new FormData();
    setClearStatus({});
    startClear(async () => {
      const result = await clearResultsAction(eventId, {}, fd);
      setClearStatus(result);
      if (result.success) setResults([]);
    });
  }

  const excelCount = results.filter((r) => r.source === "EXCEL").length;
  const myraceCount = results.filter((r) => r.source === "MYRACE").length;

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-lg font-bold text-ink">Результаты</h2>

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-ink-soft">
              {results.length} результатов
              {excelCount > 0 && ` (CSV: ${excelCount})`}
              {myraceCount > 0 && ` (myrace.info: ${myraceCount})`}
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={clearPending}
              className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
            >
              {clearPending ? "Удаляется…" : "Удалить все"}
            </button>
          </div>
          {clearStatus.error && <p className="text-sm text-danger">Ошибка</p>}

          <div className="overflow-x-auto rounded-[var(--radius-s)] border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint tabular-nums">Место</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint tabular-nums">№</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Имя</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint tabular-nums">Время</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Категория</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Источник</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 50).map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="px-3 py-2 tabular-nums font-bold text-ink">{r.place ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-soft">{r.bibNumber}</td>
                    <td className="px-3 py-2 text-ink">{r.name}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-soft">{r.time ?? "—"}</td>
                    <td className="px-3 py-2 text-ink-faint">{r.category ?? "—"}</td>
                    <td className="px-3 py-2 text-[11px] uppercase tracking-wide text-ink-faint">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length > 50 && (
              <p className="px-3 py-2 text-xs text-ink-faint">
                Показано 50 из {results.length}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        {/* CSV upload */}
        <div className="flex flex-col gap-3 rounded-[var(--radius-s)] border border-border p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">Загрузить CSV</div>
          <p className="text-xs text-ink-soft">
            Колонки: <code className="rounded bg-surface-2 px-1">номер,имя,место,время,категория</code>
          </p>
          <label className={`cursor-pointer self-start rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft ${csvPending ? "opacity-50" : ""}`}>
            {csvPending ? "Загружается…" : "Выбрать файл (.csv)"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={handleCsv}
              disabled={csvPending}
            />
          </label>
          {csvStatus.success && <p className="text-sm text-spruce">Загружено {csvStatus.count} строк ✓</p>}
          {csvStatus.error && <p className="text-sm text-danger">Ошибка: {csvStatus.error}</p>}
        </div>

        {/* myrace.info fetch */}
        <div className="flex flex-col gap-3 rounded-[var(--radius-s)] border border-border p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">myrace.info</div>
          <form onSubmit={handleMyrace} className="flex flex-col gap-2">
            <input
              type="url"
              value={myraceUrl}
              onChange={(e) => setMyraceUrl(e.target.value)}
              placeholder="https://live.myrace.info/…"
              className="w-full rounded border border-border bg-surface px-3 py-1.5 text-sm focus:border-ember focus:outline-none"
            />
            <button
              type="submit"
              disabled={myracePending || !myraceUrl}
              className="self-start rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft disabled:opacity-50"
            >
              {myracePending ? "Загружается…" : "Загрузить"}
            </button>
          </form>
          {myraceStatus.success && <p className="text-sm text-spruce">Загружено {myraceStatus.count} результатов ✓</p>}
          {myraceStatus.error && <p className="text-sm text-danger">Ошибка: {myraceStatus.error}</p>}
        </div>
      </div>
    </section>
  );
}
