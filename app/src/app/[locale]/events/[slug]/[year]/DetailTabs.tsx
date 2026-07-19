"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useFormatter } from "next-intl";
import { Icon } from "@/components/IconSprite";
import { ElevationProfile } from "@/components/ElevationProfile";
import { TrackMap } from "@/components/TrackMap";
import { TimeChart } from "@/components/TimeChart";
import { fullName } from "@/lib/user";
import type { ProfileData } from "@/lib/gpxParser";
import type { AidStation } from "@/types/aidStation";
import type { RegulationFile, RegulationBlock, RegulationLocale } from "@/types/regulation";

type Tab = "course" | "regulation" | "participants" | "profile";

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
  regulationFiles: RegulationFile[];
  regulationBlocks: RegulationBlock[];
  registrations: Registration[];
  distances?: DistanceWithProfile[];
};

export function DetailTabs({
  courseIntro,
  regulationFiles,
  regulationBlocks,
  registrations,
  distances = [],
}: Props) {
  const t = useTranslations("EventDetail");
  const locale = useLocale() as RegulationLocale;
  const hasProfile = distances.length > 0;
  const [tab, setTab] = useState<Tab>("course");
  const [activeDistId, setActiveDistId] = useState(distances[0]?.id ?? "");
  const activeDist = distances.find((d) => d.id === activeDistId) ?? distances[0];

  const filesForLocale = regulationFiles.filter((f) => f.locale === locale);
  const hasRegulation = filesForLocale.length > 0 || regulationBlocks.length > 0;

  const tabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: "course", label: t("courseTitle") },
    { id: "regulation", label: t("regulationTitle") },
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

        {tab === "regulation" && (
          <div className="flex flex-col gap-6">
            {!hasRegulation && (
              <p className="text-sm text-ink-faint">{t("regulationEmpty")}</p>
            )}

            {filesForLocale.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                  {t("regulationFilesLabel")}
                </div>
                <div className="flex flex-col gap-2">
                  {filesForLocale.map((f, i) => (
                    <a
                      key={i}
                      href={f.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-[var(--radius-s)] border border-border bg-surface-2 px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-ink-soft hover:bg-surface"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                        <path d="M9 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5L9 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                        <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                        <path d="M8 10V7M6.5 8.5 8 10l1.5-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="flex-1">{f.name}</span>
                      <span className="shrink-0 text-xs text-ember">{t("regulationDownloadLabel")}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {regulationBlocks.length > 0 && (
              <div className="flex flex-col gap-4">
                {regulationBlocks
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((block) => {
                    const title = block.title[locale] || block.title.ru || block.title.en || block.title.kk;
                    const content = block.content[locale] || block.content.ru || block.content.en || block.content.kk;
                    if (!title && !content) return null;
                    return (
                      <div key={block.id} className="flex flex-col gap-2">
                        {title && (
                          <h3 className="font-display text-base font-bold text-ink">{title}</h3>
                        )}
                        {content && (
                          <p className="text-sm leading-relaxed text-ink-soft whitespace-pre-line">{content}</p>
                        )}
                      </div>
                    );
                  })}
              </div>
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
