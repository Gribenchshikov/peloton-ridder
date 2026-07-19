"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Icon } from "@/components/IconSprite";
import { ElevationProfile } from "@/components/ElevationProfile";
import { TrackMap } from "@/components/TrackMap";
import { TimeChart } from "@/components/TimeChart";
import { fullName } from "@/lib/user";
import type { ProfileData } from "@/lib/gpxParser";
import type { AidStation } from "@/types/aidStation";

type Tab = "course" | "equipment" | "participants" | "profile";

type Registration = {
  id: string;
  user: { firstName: string; lastName: string };
  distance: { name: string };
  bibNumber: number | null;
};

export type DistanceWithProfile = {
  id: string;
  name: string;
  km: number;
  profileData: ProfileData;
  gpxUrl: string | null;
  aidStations: AidStation[];
  raceStartMinutes: number | null;
};

type Props = {
  courseIntro: string;
  equipment: string[];
  registrations: Registration[];
  distances?: DistanceWithProfile[];
};

export function DetailTabs({ courseIntro, equipment, registrations, distances = [] }: Props) {
  const t = useTranslations("EventDetail");
  const hasProfile = distances.length > 0;
  const [tab, setTab] = useState<Tab>("course");
  const [activeDistId, setActiveDistId] = useState(distances[0]?.id ?? "");
  const activeDist = distances.find((d) => d.id === activeDistId) ?? distances[0];

  const tabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: "course", label: t("courseTitle") },
    { id: "equipment", label: t("equipmentTitle") },
    { id: "profile", label: t("courseProfileTitle"), hidden: !hasProfile },
    { id: "participants", label: t("participantsTitle") },
  ];

  return (
    <div className="rounded-[var(--radius-m)] border border-border bg-surface">
      <div className="flex gap-0 overflow-x-auto border-b border-border px-4">
        {tabs.filter((t) => !t.hidden).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 border-b-2 px-4 py-3.5 text-sm font-semibold transition-colors ${
              tab === id
                ? "border-ember text-ember"
                : "border-transparent text-ink-faint hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === "course" && (
          <div>
            {courseIntro ? (
              <p
                className="max-w-2xl text-[1.02rem] leading-relaxed text-ink-soft"
                dangerouslySetInnerHTML={{ __html: courseIntro }}
              />
            ) : (
              <p className="text-sm text-ink-faint">{t("courseEmpty")}</p>
            )}
          </div>
        )}

        {tab === "equipment" && (
          <div>
            {equipment.length === 0 ? (
              <p className="text-sm text-ink-faint">{t("equipmentEmpty")}</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {equipment.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-ink-soft">
                    <Icon name="i-check" className="mt-0.5 h-4 w-4 shrink-0 text-spruce" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "profile" && activeDist && (
          <div className="flex flex-col gap-5">
            {/* Distance selector + GPX download */}
            <div className="flex items-center justify-between gap-3">
              {distances.length > 1 ? (
                <div className="flex gap-1 overflow-x-auto">
                  {distances.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setActiveDistId(d.id)}
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                        d.id === activeDistId
                          ? "bg-ember text-white"
                          : "border border-border text-ink-soft hover:text-ink"
                      }`}
                    >
                      {d.name}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-sm font-semibold text-ink">{activeDist.name}</span>
              )}

              {activeDist.gpxUrl && (
                <a
                  href={activeDist.gpxUrl}
                  download
                  className="shrink-0 flex items-center gap-1.5 rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-ink-soft hover:text-ink"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M6 1v7M3 6l3 3 3-3M1 10h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t("downloadGpxCta")}
                </a>
              )}
            </div>

            {/* Elevation chart */}
            <ElevationProfile
              points={activeDist.profileData.points}
              gainM={activeDist.profileData.gainM}
              lossM={activeDist.profileData.lossM}
              distanceName={activeDist.name}
              aidStations={activeDist.aidStations}
              raceStartMinutes={activeDist.raceStartMinutes}
            />

            {/* Map */}
            {activeDist.profileData.track && activeDist.profileData.meta && activeDist.profileData.track.length >= 2 && (
              <TrackMap
                key={activeDist.id}
                track={activeDist.profileData.track}
                startLat={activeDist.profileData.meta.startLat}
                startLon={activeDist.profileData.meta.startLon}
              />
            )}

            {/* Aid station time chart */}
            {activeDist.aidStations.length > 0 && (
              <TimeChart
                stations={activeDist.aidStations}
                points={activeDist.profileData.points}
                raceStartMinutes={activeDist.raceStartMinutes}
              />
            )}
          </div>
        )}

        {tab === "participants" && (
          <div>
            {registrations.length === 0 ? (
              <p className="text-sm text-ink-faint">{t("participantsEmpty")}</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-ink-faint">
                  {t("participantsCount", { count: registrations.length })}
                </p>
                <div className="overflow-x-auto rounded-[var(--radius-s)] border border-border">
                  <table className="w-full min-w-[360px] text-sm">
                    <tbody>
                      {registrations.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                          <td className="px-4 py-2.5 font-semibold text-ink">{fullName(r.user)}</td>
                          <td className="px-4 py-2.5 text-ink-soft">{r.distance.name}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-ink-faint">
                            {r.bibNumber != null ? `#${r.bibNumber}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
