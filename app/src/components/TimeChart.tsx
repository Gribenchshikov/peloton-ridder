import type { ElevationPoint } from "@/lib/gpxParser";
import type { AidStation } from "@/types/aidStation";

type Props = {
  stations: AidStation[];
  points: ElevationPoint[];
};

function elevationAtKm(points: ElevationPoint[], km: number): number | null {
  if (points.length === 0) return null;
  return points.reduce((prev, curr) => (Math.abs(curr.d - km) < Math.abs(prev.d - km) ? curr : prev)).e;
}

// Cumulative elevation gain and loss from start up to kmTarget
function cumulativeStats(points: ElevationPoint[], kmTarget: number): { gain: number; loss: number } {
  let gain = 0;
  let loss = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].d > kmTarget) break;
    const diff = points[i].e - points[i - 1].e;
    if (diff > 0) gain += diff;
    else loss += Math.abs(diff);
  }
  return { gain: Math.round(gain), loss: Math.round(loss) };
}

function formatCutoff(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `+${h}:${m.toString().padStart(2, "0")}`;
}

const TYPE_ICON: Record<string, string> = {
  water: "💧",
  food: "🍌",
  checkpoint: "🏁",
};

export function TimeChart({ stations, points }: Props) {
  if (stations.length === 0) return null;

  const sorted = [...stations].sort((a, b) => a.km - b.km);
  const hasCutoffs = sorted.some((s) => s.cutoffMinutes != null);

  return (
    <div className="overflow-x-auto rounded-[var(--radius-s)] border border-border">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2 text-left">
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Пункт питания</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">Высота, м</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">Дист., км</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">Отрезок, км</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">↑ Набор, м</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">↓ Сброс, м</th>
            {hasCutoffs && (
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">Кат-офф</th>
            )}
            <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-ink-faint">Сервис</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s, i) => {
            const elev = elevationAtKm(points, s.km);
            const { gain, loss } = cumulativeStats(points, s.km);
            const prevKm = i === 0 ? 0 : sorted[i - 1].km;
            const inter = (s.km - prevKm).toFixed(1);

            return (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2">
                <td className="px-4 py-2.5 font-medium text-ink">{s.name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">
                  {elev != null ? Math.round(elev) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{s.km}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-faint">{inter}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{gain}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-ink-soft">{loss}</td>
                {hasCutoffs && (
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-ink">
                    {s.cutoffMinutes != null ? formatCutoff(s.cutoffMinutes) : "—"}
                  </td>
                )}
                <td className="px-3 py-2.5 text-center text-base">
                  {TYPE_ICON[s.type] ?? "•"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
