import type { ElevationPoint } from "@/lib/gpxParser";

type AidStation = { name: string; km: number; type?: string };

type Props = {
  points: ElevationPoint[];
  gainM: number;
  lossM: number;
  color?: string;
  aidStations?: AidStation[];
  gpxUrl?: string | null;
  distanceName: string;
};

const W = 800;
const H = 200;
const PAD = { top: 16, right: 12, bottom: 28, left: 44 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

function niceInterval(range: number, targetLines = 4): number {
  const raw = range / targetLines;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const candidates = [1, 2, 2.5, 5, 10].map((c) => c * magnitude);
  return candidates.find((c) => range / c <= targetLines + 1) ?? candidates[candidates.length - 1];
}

export function ElevationProfile({ points, gainM, lossM, color = "#E74C3C", aidStations = [], gpxUrl, distanceName }: Props) {
  if (points.length < 2) return null;

  const maxD = points[points.length - 1].d;
  const elevs = points.map((p) => p.e);
  const minE = Math.min(...elevs);
  const maxE = Math.max(...elevs);
  const eRange = maxE - minE || 1;

  const toX = (d: number) => PAD.left + (d / maxD) * CW;
  const toY = (e: number) => PAD.top + CH - ((e - minE) / eRange) * CH;

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
        <span className="text-ink-soft">
          <span className="font-semibold text-ink">↑ {gainM.toLocaleString()} м</span>
        </span>
        <span className="text-ink-soft">
          <span className="font-semibold text-ink">↓ {lossM.toLocaleString()} м</span>
        </span>
        <span className="text-ink-soft">
          <span className="font-semibold text-ink">{maxD.toFixed(1)} км</span>
        </span>
        {gpxUrl && (
          <a
            href={gpxUrl}
            download
            className="ml-auto flex items-center gap-1 rounded-[var(--radius-s)] border border-border px-3 py-1 text-xs font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            ↓ GPX
          </a>
        )}
      </div>

      {/* SVG profile */}
      <div className="overflow-hidden rounded-[var(--radius-s)] border border-border bg-surface-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: "clamp(140px, 22vw, 200px)" }}
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
            const markerColor = s.type === "finish" ? "#E74C3C" : s.type === "aid" ? "#3498DB" : "#27AE60";
            return (
              <g key={s.name + s.km}>
                <line
                  x1={x}
                  y1={PAD.top}
                  x2={x}
                  y2={toY(minE).toFixed(1)}
                  stroke={markerColor}
                  strokeWidth="1"
                  strokeDasharray="3,2"
                  strokeOpacity="0.7"
                />
                <rect
                  x={parseFloat(x) - 14}
                  y={PAD.top + CH + 2}
                  width="28"
                  height="11"
                  fill={markerColor}
                  rx="2"
                />
                <text
                  x={x}
                  y={PAD.top + CH + 8.5}
                  textAnchor="middle"
                  fontSize="6.5"
                  fill="white"
                  fontFamily="system-ui,sans-serif"
                  fontWeight="600"
                >
                  {s.km}км
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
            y1={PAD.top + CH}
            x2={W - PAD.right}
            y2={PAD.top + CH}
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
