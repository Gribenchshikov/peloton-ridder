"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ElevationProfile } from "@/components/ElevationProfile";
import { TrackMap } from "@/components/TrackMap";
import type { ProfileData } from "@/lib/gpxParser";

type DistanceWithProfile = {
  id: string;
  name: string;
  km: number;
  profileData: ProfileData;
  gpxUrl: string | null;
  color?: string;
};

export function DistanceProfiles({ distances }: { distances: DistanceWithProfile[] }) {
  const t = useTranslations("Admin");
  const [activeId, setActiveId] = useState(distances[0]?.id ?? "");
  const active = distances.find((d) => d.id === activeId) ?? distances[0];

  if (!active) return null;

  return (
    <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
      {/* Distance selector */}
      {distances.length > 1 && (
        <div className="mb-4 flex gap-1 overflow-x-auto">
          {distances.map((d) => (
            <button
              key={d.id}
              onClick={() => setActiveId(d.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                d.id === activeId
                  ? "bg-ember text-white"
                  : "border border-border text-ink-soft hover:text-ink"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Profile title for single distance */}
      {distances.length === 1 && (
        <h3 className="mb-4 font-display text-base font-bold text-ink">
          {active.name} — {t("elevationProfileTitle")}
        </h3>
      )}

      {/* Elevation profile */}
      <ElevationProfile
        points={active.profileData.points}
        gainM={active.profileData.gainM}
        lossM={active.profileData.lossM}
        color={active.color ?? "#E2531F"}
        gpxUrl={active.gpxUrl}
        distanceName={active.name}
      />

      {/* Map — only if track data is available */}
      {active.profileData.track && active.profileData.meta && active.profileData.track.length >= 2 && (
        <div className="mt-4">
          <TrackMap
            key={active.id}
            track={active.profileData.track}
            startLat={active.profileData.meta.startLat}
            startLon={active.profileData.meta.startLon}
            color={active.color ?? "#E2531F"}
          />
        </div>
      )}
    </div>
  );
}
