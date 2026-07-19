"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

type Props = {
  track: [number, number][]; // [lat, lon]
  startLat: number;
  startLon: number;
  color?: string;
};

export function TrackMap({ track, startLat, startLon, color = "#E2531F" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!containerRef.current || cleanupRef.current) return;

    const el = containerRef.current;

    import("leaflet").then((L) => {
      // Prevent double-init if effect re-runs
      if ((el as HTMLElement & { _leaflet_id?: number })._leaflet_id) return;

      const map = L.map(el, { zoomControl: true, scrollWheelZoom: false, maxBoundsViscosity: 1.0 }).setView(
        [startLat, startLon],
        11,
      );

      const key = process.env.NEXT_PUBLIC_MAPTILER_KEY;
      L.tileLayer(
        key
          ? `https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=${key}`
          : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: key
            ? '© <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
            : '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
          tileSize: key ? 512 : 256,
          zoomOffset: key ? -1 : 0,
        },
      ).addTo(map);

      const polyline = L.polyline(track, {
        color,
        weight: 3,
        opacity: 0.85,
      }).addTo(map);

      const trackBounds = polyline.getBounds();
      map.fitBounds(trackBounds, { padding: [24, 24] });

      // Lock the map to the track area + 40% padding on each side.
      // Prevents users from panning to unrelated regions and wasting tile quota.
      map.setMaxBounds(trackBounds.pad(0.4));
      map.setMinZoom(map.getZoom() - 2);

      // Start marker (green circle)
      const startIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:#16a34a;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });
      // Finish marker (ember circle)
      const finishIcon = L.divIcon({
        html: `<div style="width:12px;height:12px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
        className: "",
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      L.marker(track[0], { icon: startIcon }).addTo(map);
      L.marker(track[track.length - 1], { icon: finishIcon }).addTo(map);

      cleanupRef.current = () => map.remove();
    });

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-[480px] w-full overflow-hidden rounded-[var(--radius-m)] border border-border"
      aria-label="Карта трассы"
    />
  );
}
