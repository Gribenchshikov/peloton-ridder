import type { ElevationPoint } from "@/lib/gpxParser";
import type { AidStation } from "@/types/aidStation";

type Props = {
  points: ElevationPoint[];
  gainM: number;
  lossM: number;
  color?: string;
  aidStations?: AidStation[];
  distanceName: string;
};

const W = 800;
// Extra bottom padding for aid station icons below the chart area
const H = 240;
const PAD = { top: 16, right: 12, bottom: 68, left: 44 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom; // = 156

function niceInterval(range: number, targetLines = 4): number {
  const raw = range / targetLines;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1, 2, 2.5, 5, 10].map((c) => c * magnitude);
  return candidates.find((c) => range / c <= targetLines + 1) ?? candidates[candidates.length - 1];
}

function elevationAtKm(points: ElevationPoint[], km: number): number {
  return points.reduce((prev, curr) => (Math.abs(curr.d - km) < Math.abs(prev.d - km) ? curr : prev)).e;
}

const STATION_EMOJI: Record<string, string> = {
  water: "💧",
  food: "🍌",
  checkpoint: "🏁",
};

const STATION_COLOR: Record<string, string> = {
  water: "#3B82F6",
  food: "#10B981",
  checkpoint: "#F59E0B",
};

export function ElevationProfile({ points, gainM, lossM, color = "#E74C3C", aidStations = [], distanceName }: Props) {
  if (points.length < 2) return null;

  const maxD = points[points.length - 1].d;
  const elevs = points.map((p) => p.e);
  const minE = Math.min(...elevs);
  const maxE = Math.max(...elevs);
  const eRange = maxE - minE || 1;

  const toX = (d: number) => PAD.left + (d / maxD) * CW;
  const toY = (e: number) => PAD.top + CH - ((e - minE) / eRange) * CH;
  const chartBottom = PAD.top + CH; // y=172

  // Build SVG path for profile + closed area
  const linePts = points.map((p) => `${toX(p.d).toFixed(1)},${toY(p.e).toFixed(1)}`).join(" L");
  const profileD = `M${linePts}`;
  const areaD = `M${toX(0).toFixed(1)},${toY(minE).toFixed(1)} L${linePts} L${toX(maxD).toFixed(1)},${toY(minE).toFixed(1)} Z`;

  // Horizontal grid lines
  const interval = niceInterval(eRange);
  const firstLine = Math.ceil(minE / interval) * interval;
  const gridLines: number[] = [];
  for (let e = firstLine; e <= maxE; e += interval) {
    if (e > minE + eRange * 0.05) gridLines.push(e);
  }

  // X axis distance labels (every ~10 km, at most 8 labels)
  const xStep = Math.ceil(maxD / 8 / 5) * 5 || 1;
  const xLabels: number[] = [];
  for (let d = xStep; d < maxD - xStep * 0.3; d += xStep) xLabels.push(d);

  const gradId = `elev-grad-${distanceName.replace(/\s+/g, "")}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-bold text-ink">{distanceName}</span>
        <span className="font-semibold text-ink">↑ {gainM.toLocaleString()} м</span>
        <span className="font-semibold text-ink">↓ {lossM.toLocaleString()} м</span>
        <span className="font-semibold text-ink">{maxD.toFixed(1)} км</span>
      </div>

      {/* SVG profile */}
      <div className="overflow-hidden rounded-[var(--radius-s)] border border-border bg-surface-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: "clamp(175px, 27vw, 240px)" }}
          aria-label={`Профиль трассы ${distanceName}`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.6" />
              <stop offset="100%" stopColor={color} stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {gridLines.map((e) => {
            const y = toY(e).toFixed(1);
            return (
              <g key={e}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={W - PAD.right}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  strokeOpacity="0.3"
                  className="text-ink"
                />
                <text
                  x={PAD.left - 4}
                  y={y}
                  dy="-0.3em"
                  textAnchor="end"
                  fontSize="8"
                  fill="currentColor"
                  fillOpacity="0.65"
                  className="text-ink"
                  fontFamily="system-ui,sans-serif"
                >
                  {e}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill={`url(#${gradId})`} />

          {/* Profile line */}
          <path d={profileD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />

          {/* Aid station markers */}
          {aidStations.map((s) => {
            if (s.km > maxD) return null;
            const x = toX(s.km).toFixed(1);
            const xNum = parseFloat(x);
            const profileY = toY(elevationAtKm(points, s.km));
            const markerColor = STATION_COLOR[s.type] ?? "#6B7280";
            const emoji = STATION_EMOJI[s.type] ?? "•";
            const label = s.name.length > 9 ? s.name.slice(0, 8) + "…" : s.name;

            return (
              <g key={`${s.name}-${s.km}`}>
                {/* Dashed connector from profile dot to chart baseline */}
                <line
                  x1={x}
                  y1={profileY.toFixed(1)}
                  x2={x}
                  y2={chartBottom}
                  stroke={markerColor}
                  strokeWidth="0.8"
                  strokeDasharray="2.5,2"
                  strokeOpacity="0.6"
                />
                {/* Circle on the profile line */}
                <circle
                  cx={xNum}
                  cy={profileY}
                  r={3.5}
                  fill="white"
                  stroke={markerColor}
                  strokeWidth="1.5"
                />
                {/* Emoji icon below chart */}
                <text
                  x={x}
                  y={chartBottom + 18}
                  textAnchor="middle"
                  fontSize="14"
                  fontFamily="system-ui,sans-serif"
                >
                  {emoji}
                </text>
                {/* Station name */}
                <text
                  x={x}
                  y={chartBottom + 36}
                  textAnchor="middle"
                  fontSize="7"
                  fill={markerColor}
                  fillOpacity="0.9"
                  fontFamily="system-ui,sans-serif"
                  fontWeight="600"
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* X axis labels */}
          {xLabels.map((d) => (
            <text
              key={d}
              x={toX(d).toFixed(1)}
              y={H - 4}
              textAnchor="middle"
              fontSize="7.5"
              fill="currentColor"
              fillOpacity="0.4"
              className="text-ink"
              fontFamily="system-ui,sans-serif"
            >
              {d}км
            </text>
          ))}

          {/* Bottom baseline */}
          <line
            x1={PAD.left}
            y1={chartBottom}
            x2={W - PAD.right}
            y2={chartBottom}
            stroke="currentColor"
            strokeWidth="0.5"
            strokeOpacity="0.2"
            className="text-ink"
          />
        </svg>
      </div>
    </div>
  );
}
