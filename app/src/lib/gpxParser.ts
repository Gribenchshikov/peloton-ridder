export type ElevationPoint = { d: number; e: number }; // d=km cumulative, e=elevation m

export type ProfileData = {
  points: ElevationPoint[];
  gainM: number;
  lossM: number;
  // optional: added for map display; absent in data parsed before this field was added
  track?: [number, number][]; // [lat, lon] downsampled ~400 pts
  meta?: {
    startLat: number;
    startLon: number;
    totalKm: number;
    minEle: number;
    maxEle: number;
  };
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Smooth elevation values with a simple moving average to remove GPS noise.
function smooth(values: number[], window = 5): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window);
    const end = Math.min(values.length - 1, i + window);
    let sum = 0;
    for (let j = start; j <= end; j++) sum += values[j];
    return sum / (end - start + 1);
  });
}

export function parseGpx(text: string): ProfileData | null {
  // GPX trkpt with optional elevation: <trkpt lat="..." lon="..."><ele>...</ele></trkpt>
  const trkptRe =
    /<trkpt\s[^>]*\blat="([\d.+-]+)"[^>]*\blon="([\d.+-]+)"[^>]*>(?:[^<]*<[^/][^>]*>[^<]*<\/[^>]*>)*?(?:[^<]*<ele>([\d.+-]+)<\/ele>)?[\s\S]*?<\/trkpt>/g;

  const lats: number[] = [];
  const lons: number[] = [];
  const eles: number[] = [];

  let m: RegExpExecArray | null;
  while ((m = trkptRe.exec(text)) !== null) {
    const lat = parseFloat(m[1]);
    const lon = parseFloat(m[2]);
    const ele = m[3] != null ? parseFloat(m[3]) : NaN;
    if (isNaN(lat) || isNaN(lon)) continue;
    lats.push(lat);
    lons.push(lon);
    eles.push(ele);
  }

  if (lats.length < 2) return null;

  const hasEle = eles.some((e) => !isNaN(e));
  const smoothedEles = hasEle ? smooth(eles.map((e) => (isNaN(e) ? 0 : e))) : eles.map(() => 0);

  // Build cumulative distance array and compute gain/loss on smoothed elevation.
  const points: ElevationPoint[] = [];
  let cumDist = 0;
  let gainM = 0;
  let lossM = 0;

  points.push({ d: 0, e: Math.round(smoothedEles[0]) });

  for (let i = 1; i < lats.length; i++) {
    cumDist += haversineKm(lats[i - 1], lons[i - 1], lats[i], lons[i]);
    const dEle = smoothedEles[i] - smoothedEles[i - 1];
    if (dEle > 0) gainM += dEle;
    else lossM += -dEle;
    points.push({ d: Math.round(cumDist * 100) / 100, e: Math.round(smoothedEles[i]) });
  }

  // Downsample elevation points to ≤500 for reasonable storage size.
  const maxPoints = 500;
  const sampled =
    points.length <= maxPoints
      ? points
      : (() => {
          const step = points.length / maxPoints;
          const out: ElevationPoint[] = [];
          for (let i = 0; i < maxPoints; i++) {
            out.push(points[Math.min(Math.round(i * step), points.length - 1)]);
          }
          out.push(points[points.length - 1]);
          return out;
        })();

  // Downsample lat/lon track to ≤400 points for the map polyline.
  const maxTrack = 400;
  const track: [number, number][] =
    lats.length <= maxTrack
      ? lats.map((lat, i) => [Math.round(lat * 100000) / 100000, Math.round(lons[i] * 100000) / 100000])
      : (() => {
          const step = lats.length / maxTrack;
          const out: [number, number][] = [];
          for (let i = 0; i < maxTrack; i++) {
            const idx = Math.min(Math.round(i * step), lats.length - 1);
            out.push([Math.round(lats[idx] * 100000) / 100000, Math.round(lons[idx] * 100000) / 100000]);
          }
          out.push([Math.round(lats[lats.length - 1] * 100000) / 100000, Math.round(lons[lats.length - 1] * 100000) / 100000]);
          return out;
        })();

  const validEles = smoothedEles.filter((e) => !isNaN(e));

  return {
    points: sampled,
    gainM: Math.round(gainM),
    lossM: Math.round(lossM),
    track,
    meta: {
      startLat: lats[0],
      startLon: lons[0],
      totalKm: Math.round(cumDist * 100) / 100,
      minEle: Math.round(Math.min(...validEles)),
      maxEle: Math.round(Math.max(...validEles)),
    },
  };
}
