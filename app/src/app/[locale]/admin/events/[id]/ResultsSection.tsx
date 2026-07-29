"use client";

import { useState, useTransition } from "react";
import { importResultsCsvAction, importItraResultsAction, fetchMyraceResultsAction, clearResultsAction } from "../actions";
import type { Result } from "@/generated/prisma/client";

type Distance = { id: string; name: string; km: number };

type Props = {
  eventId: string;
  initialResults: Result[];
  distances: Distance[];
};

export function ResultsSection({ eventId, initialResults, distances }: Props) {
  const [results, setResults] = useState<Result[]>(initialResults);
  const [csvStatus, setCsvStatus] = useState<{ error?: string; success?: boolean; count?: number }>({});
  const [itraStatus, setItraStatus] = useState<{ error?: string; success?: boolean; count?: number }>({});
  const [myraceStatus, setMyraceStatus] = useState<{ error?: string; success?: boolean; count?: number }>({});
  const [clearStatus, setClearStatus] = useState<{ error?: string; success?: boolean }>({});
  const [myraceUrl, setMyraceUrl] = useState("");
  const [csvDistanceId, setCsvDistanceId] = useState(distances[0]?.id ?? "");
  const [itraDistanceId, setItraDistanceId] = useState(distances[0]?.id ?? "");
  const [filterDistanceId, setFilterDistanceId] = useState<string>("all");
  const [csvPending, startCsv] = useTransition();
  const [itraPending, startItra] = useTransition();
  const [myracePending, startMyrace] = useTransition();
  const [clearPending, startClear] = useTransition();

  function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    if (csvDistanceId) fd.set("distanceId", csvDistanceId);
    setCsvStatus({});
    startCsv(async () => {
      const result = await importResultsCsvAction(eventId, {}, fd);
      setCsvStatus(result);
      if (result.success) window.location.reload();
    });
    e.target.value = "";
  }

  function handleItra(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    if (itraDistanceId) fd.set("distanceId", itraDistanceId);
    setItraStatus({});
    startItra(async () => {
      const result = await importItraResultsAction(eventId, {}, fd);
      setItraStatus(result);
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
  const itraCount = results.filter((r) => r.source === "ITRA").length;
  const myraceCount = results.filter((r) => r.source === "MYRACE").length;

  const filteredResults =
    filterDistanceId === "all"
      ? results
      : results.filter((r) => r.distanceId === filterDistanceId);

  const distanceMap = Object.fromEntries(distances.map((d) => [d.id, d.name]));

  return (
    <section className="flex flex-col gap-6">
      <h2 className="font-display text-lg font-bold text-ink">Результаты</h2>

      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-ink-soft">
              {results.length} результатов
              {excelCount > 0 && ` (CSV: ${excelCount})`}
              {itraCount > 0 && ` (ITRA: ${itraCount})`}
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

          {distances.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setFilterDistanceId("all")}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  filterDistanceId === "all"
                    ? "bg-ember text-white"
                    : "bg-surface-2 text-ink-soft hover:text-ink"
                }`}
              >
                Все
              </button>
              {distances.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setFilterDistanceId(d.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    filterDistanceId === d.id
                      ? "bg-ember text-white"
                      : "bg-surface-2 text-ink-soft hover:text-ink"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-x-auto rounded-[var(--radius-s)] border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint tabular-nums">Место</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint tabular-nums">№</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Имя</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint tabular-nums">Время</th>
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Категория</th>
                  {distances.length > 0 && (
                    <th className="px-3 py-2 text-left font-semibold text-ink-faint">Дистанция</th>
                  )}
                  <th className="px-3 py-2 text-left font-semibold text-ink-faint">Источник</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.slice(0, 50).map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="px-3 py-2 tabular-nums font-bold text-ink">{r.place ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-soft">{r.bibNumber}</td>
                    <td className="px-3 py-2 text-ink">{r.name}</td>
                    <td className="px-3 py-2 tabular-nums text-ink-soft">{r.time ?? "—"}</td>
                    <td className="px-3 py-2 text-ink-faint">{r.category ?? "—"}</td>
                    {distances.length > 0 && (
                      <td className="px-3 py-2 text-ink-faint">
                        {r.distanceId ? (distanceMap[r.distanceId] ?? "—") : "—"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-[11px] uppercase tracking-wide text-ink-faint">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredResults.length > 50 && (
              <p className="px-3 py-2 text-xs text-ink-faint">
                Показано 50 из {filteredResults.length}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* CSV upload */}
        <div className="flex flex-col gap-3 rounded-[var(--radius-s)] border border-border p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">Загрузить CSV</div>
          <p className="text-xs text-ink-soft">
            Колонки: <code className="rounded bg-surface-2 px-1">номер,имя,место,время,категория</code>
          </p>
          {distances.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-soft">Дистанция</label>
              <select
                value={csvDistanceId}
                onChange={(e) => setCsvDistanceId(e.target.value)}
                className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:border-ember focus:outline-none"
              >
                {distances.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.km} км)
                  </option>
                ))}
              </select>
            </div>
          )}
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

        {/* ITRA Excel upload */}
        <div className="flex flex-col gap-3 rounded-[var(--radius-s)] border border-border p-4">
          <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">ITRA Excel</div>
          <p className="text-xs text-ink-soft">
            Файл <code className="rounded bg-surface-2 px-1">ITRA-RaceResults_*.xlsx</code> — финишный протокол ITRA
          </p>
          {distances.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-soft">Дистанция</label>
              <select
                value={itraDistanceId}
                onChange={(e) => setItraDistanceId(e.target.value)}
                className="w-full rounded border border-border bg-surface px-2 py-1.5 text-sm text-ink focus:border-ember focus:outline-none"
              >
                {distances.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.km} км)
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className={`cursor-pointer self-start rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft ${itraPending ? "opacity-50" : ""}`}>
            {itraPending ? "Загружается…" : "Выбрать файл (.xlsx)"}
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              onChange={handleItra}
              disabled={itraPending}
            />
          </label>
          {itraStatus.success && <p className="text-sm text-spruce">Загружено {itraStatus.count} строк ✓</p>}
          {itraStatus.error === "invalid" && <p className="text-sm text-danger">Неверный формат файла</p>}
          {itraStatus.error === "empty_file" && <p className="text-sm text-danger">Файл пустой</p>}
          {itraStatus.error === "no_rows" && <p className="text-sm text-danger">Нет данных для импорта</p>}
          {itraStatus.error === "tooLarge" && <p className="text-sm text-danger">Файл слишком большой</p>}
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
