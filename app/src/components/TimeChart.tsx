import type { ElevationPoint } from "@/lib/gpxParser";
import type { AidStation } from "@/types/aidStation";

type Props = {
  stations: AidStation[];
  points: ElevationPoint[];
  raceStartMinutes?: number | null;
};

function elevationAtKm(points: ElevationPoint[], km: number): number | null {
  if (points.length === 0) return null;
  return points.reduce((prev, curr) => (Math.abs(curr.d - km) < Math.abs(prev.d - km) ? curr : prev)).e;
}

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

function padTwo(n: number) {
  return n.toString().padStart(2, "0");
}

// Returns absolute clock time string given raceStart (minutes from midnight) + cutoffMinutes offset
function absoluteTime(raceStartMinutes: number, cutoffMinutes: number): string {
  const total = raceStartMinutes + cutoffMinutes;
  const day = Math.floor(total / 1440);
  const mins = total % 1440;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const time = `${padTwo(h)}:${padTwo(m)}`;
  return day > 0 ? `${time} +${day}д` : time;
}

const TYPE_ICON: Record<string, string> = {
  water: "💧",
  food: "🍌",
  checkpoint: "🏁",
};

const TYPE_COLOR: Record<string, string> = {
  water: "#3B82F6",
  food: "#10B981",
  checkpoint: "#F59E0B",
};

export function TimeChart({ stations, points, raceStartMinutes }: Props) {
  if (stations.length === 0) return null;

  const sorted = [...stations].sort((a, b) => a.km - b.km);
  const hasCutoffs = sorted.some((s) => s.cutoffMinutes != null);
  const showAbsolute = raceStartMinutes != null && hasCutoffs;

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
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Кат-офф{showAbsolute && <span className="ml-1 normal-case font-normal text-ink-faint/60">(время)</span>}
              </th>
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
            const iconColor = TYPE_COLOR[s.type] ?? "#6B7280";

            let cutoffCell: React.ReactNode = "—";
            if (s.cutoffMinutes != null) {
              cutoffCell = showAbsolute
                ? absoluteTime(raceStartMinutes!, s.cutoffMinutes)
                : `+${Math.floor(s.cutoffMinutes / 60)}:${padTwo(s.cutoffMinutes % 60)}`;
            }

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
                  <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-ink">{cutoffCell}</td>
                )}
                <td className="px-3 py-2.5 text-center">
                  <span
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs"
                    style={{ backgroundColor: `${iconColor}22` }}
                  >
                    {TYPE_ICON[s.type] ?? "•"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
