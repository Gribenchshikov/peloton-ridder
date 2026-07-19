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

function formatCutoff(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
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

export function TimeChart({ stations, points }: Props) {
  if (stations.length === 0) return null;

  const hasCutoffs = stations.some((s) => s.cutoffMinutes != null);

  return (
    <div className="overflow-x-auto rounded-[var(--radius-s)] border border-border">
      <table className="w-full min-w-[360px] text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2">
            <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Пункт питания
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">
              км
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Высота
            </th>
            {hasCutoffs && (
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Кат-офф
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {stations.map((s, i) => {
            const elev = elevationAtKm(points, s.km);
            const iconColor = TYPE_COLOR[s.type] ?? "#6B7280";
            return (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2">
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]"
                      style={{ backgroundColor: `${iconColor}20` }}
                    >
                      {TYPE_ICON[s.type] ?? "•"}
                    </span>
                    <span className="font-medium text-ink">{s.name}</span>
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{s.km}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">
                  {elev != null ? `${Math.round(elev)} м` : "—"}
                </td>
                {hasCutoffs && (
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-ink">
                    {s.cutoffMinutes != null ? formatCutoff(s.cutoffMinutes) : "—"}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
