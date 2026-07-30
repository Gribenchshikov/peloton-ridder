import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ProfileData } from "@/lib/gpxParser";

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

function interpolateElevation(d: number, points: { d: number; e: number }[]): number {
  if (points.length === 0) return 0;
  if (d <= points[0].d) return points[0].e;
  for (let i = 1; i < points.length; i++) {
    if (points[i].d >= d) {
      const t = (d - points[i - 1].d) / (points[i].d - points[i - 1].d);
      return Math.round(points[i - 1].e + t * (points[i].e - points[i - 1].e));
    }
  }
  return points[points.length - 1].e;
}

function buildGpx(name: string, profile: ProfileData): string {
  const { track, points } = profile;
  if (!track || track.length < 2) return "";

  // Rebuild cumulative distances for track points to match profile scale
  const cumDists: number[] = [0];
  for (let i = 1; i < track.length; i++) {
    cumDists.push(cumDists[i - 1] + haversineKm(track[i - 1][0], track[i - 1][1], track[i][0], track[i][1]));
  }

  const totalTrackKm = cumDists[cumDists.length - 1];
  const totalProfileKm = points[points.length - 1]?.d ?? totalTrackKm;
  const scale = totalProfileKm / (totalTrackKm || 1);

  const trkpts = track
    .map(([lat, lon], i) => {
      const ele = interpolateElevation(cumDists[i] * scale, points);
      return `      <trkpt lat="${lat}" lon="${lon}"><ele>${ele}</ele></trkpt>`;
    })
    .join("\n");

  const safeName = name.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] ?? c));

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Ridder" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>${safeName}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ distanceId: string }> }) {
  const { distanceId } = await params;

  const distance = await prisma.distance.findUnique({
    where: { id: distanceId },
    select: { name: true, profileData: true },
  });

  if (!distance?.profileData) {
    return new NextResponse("Not found", { status: 404 });
  }

  const profile = distance.profileData as unknown as ProfileData;
  if (!profile.track || profile.track.length < 2) {
    return new NextResponse("No track data", { status: 404 });
  }

  const gpx = buildGpx(distance.name, profile);
  const filename = `${distance.name.replace(/[^a-zA-Z0-9а-яёА-ЯЁ_\- ]/g, "_")}.gpx`;

  return new NextResponse(gpx, {
    headers: {
      "Content-Type": "application/gpx+xml",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
