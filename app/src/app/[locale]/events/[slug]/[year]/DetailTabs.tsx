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
import type { PhotoLink, DayProgramItem, DistanceEquipment } from "@/types/eventContent";
import { EQUIPMENT_ITEMS } from "@/types/eventContent";

type Tab = "about" | "regulation" | "participants" | "profile" | "dayprogram" | "howtoget" | "equipment";

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

type DistanceBasic = { id: string; name: string; km: number };

type Props = {
  courseIntro: string;
  aboutText: string;
  photoLinks: PhotoLink[];
  dayProgram: DayProgramItem[];
  howToGet: string;
  distanceEquipment: DistanceEquipment;
  regulationFiles: RegulationFile[];
  regulationBlocks: RegulationBlock[];
  registrations: Registration[];
  distances?: DistanceWithProfile[];
  allDistances?: DistanceBasic[];
};

export function DetailTabs({
  courseIntro,
  aboutText,
  photoLinks,
  dayProgram,
  howToGet,
  distanceEquipment,
  regulationFiles,
  regulationBlocks,
  registrations,
  distances = [],
  allDistances = [],
}: Props) {
  const t = useTranslations("EventDetail");
  const locale = useLocale() as RegulationLocale;
  const hasProfile = distances.length > 0;
  const [tab, setTab] = useState<Tab>("about");
  const [activeDistId, setActiveDistId] = useState(distances[0]?.id ?? "");
  const [equipDistId, setEquipDistId] = useState(allDistances[0]?.id ?? "");
  const activeDist = distances.find((d) => d.id === activeDistId) ?? distances[0];

  const filesForLocale = regulationFiles.filter((f) => f.locale === locale);
  const hasRegulation = filesForLocale.length > 0 || regulationBlocks.length > 0;
  const aboutBody = aboutText || courseIntro;
  const hasEquipment = Object.keys(distanceEquipment).length > 0;

  const tabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: "about", label: t("aboutTitle") },
    { id: "regulation", label: t("regulationTitle") },
    { id: "dayprogram", label: t("dayProgramTitle"), hidden: dayProgram.length === 0 },
    { id: "howtoget", label: t("howToGetTitle"), hidden: !howToGet },
    { id: "equipment", label: t("equipmentTitle"), hidden: !hasEquipment },
    { id: "profile", label: t("courseProfileTitle"), hidden: !hasProfile },
    { id: "participants", label: t("participantsTitle") },
  ];

  const equipDist = allDistances.find((d) => d.id === equipDistId) ?? allDistances[0];
  const equipForDist = equipDist ? (distanceEquipment[equipDist.id] ?? { required: [], recommended: [] }) : { required: [], recommended: [] };

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

      <div className="overflow-hidden p-6">
        {/* ── О забеге ── */}
        {tab === "about" && (
          <div className="flex flex-col gap-6">
            {aboutBody ? (
              <p
                className="max-w-2xl text-[1.02rem] leading-relaxed text-ink-soft break-words"
                dangerouslySetInnerHTML={{ __html: aboutBody }}
              />
            ) : (
              <p className="text-sm text-ink-faint">{t("aboutEmpty")}</p>
            )}

            {photoLinks.length > 0 && (
              <div>
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">
                  {t("photoLinksLabel")}
                </div>
                <div className="flex flex-wrap gap-2">
                  {photoLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-[var(--radius-s)] border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft hover:bg-surface"
                    >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
                        <rect x="1" y="2" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M1 9l3.5-3.5L7 8l3-3 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="4.5" cy="5.5" r="1" fill="currentColor"/>
                      </svg>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Регламент ── */}
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
                          <p className="text-sm leading-relaxed text-ink-soft whitespace-pre-line break-words">{content}</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* ── Программа дня ── */}
        {tab === "dayprogram" && (
          <div>
            {dayProgram.length === 0 ? (
              <p className="text-sm text-ink-faint">{t("dayProgramEmpty")}</p>
            ) : (
              <div className="flex flex-col">
                {dayProgram.map((item, i) => (
                  <div key={i} className="flex gap-4 py-3 border-b border-border last:border-0">
                    <div className="w-16 shrink-0 font-display text-sm font-bold text-ember tabular-nums">{item.time}</div>
                    <div className="text-sm leading-relaxed text-ink-soft">{item.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Как добраться ── */}
        {tab === "howtoget" && (
          <div>
            {howToGet ? (
              <p className="max-w-2xl text-sm leading-relaxed text-ink-soft whitespace-pre-line break-words">
                {howToGet}
              </p>
            ) : (
              <p className="text-sm text-ink-faint">{t("howToGetEmpty")}</p>
            )}
          </div>
        )}

        {/* ── Снаряжение ── */}
        {tab === "equipment" && (
          <div className="flex flex-col gap-5">
            {allDistances.length > 1 && (
              <div className="flex gap-1 overflow-x-auto">
                {allDistances.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setEquipDistId(d.id)}
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                      d.id === equipDistId
                        ? "bg-ember text-white"
                        : "border border-border text-ink-soft hover:text-ink"
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            )}

            {equipForDist.required.length === 0 && equipForDist.recommended.length === 0 ? (
              <p className="text-sm text-ink-faint">{t("equipmentEmpty")}</p>
            ) : (
              <div className="flex flex-col gap-5">
                {equipForDist.required.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-danger">{t("equipmentRequired")}</div>
                    <ul className="flex flex-col gap-1.5">
                      {equipForDist.required.map((key) => {
                        const item = EQUIPMENT_ITEMS.find((e) => e.key === key);
                        return item ? (
                          <li key={key} className="flex items-center gap-2.5 text-sm text-ink">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                            {item.label}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </div>
                )}
                {equipForDist.recommended.length > 0 && (
                  <div>
                    <div className="mb-2 text-xs font-bold uppercase tracking-wide text-dawn">{t("equipmentRecommended")}</div>
                    <ul className="flex flex-col gap-1.5">
                      {equipForDist.recommended.map((key) => {
                        const item = EQUIPMENT_ITEMS.find((e) => e.key === key);
                        return item ? (
                          <li key={key} className="flex items-center gap-2.5 text-sm text-ink-soft">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dawn" />
                            {item.label}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Профиль трассы ── */}
        {tab === "profile" && activeDist && (
          <div className="flex flex-col gap-5">
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

            <ElevationProfile
              points={activeDist.profileData.points}
              gainM={activeDist.profileData.gainM}
              lossM={activeDist.profileData.lossM}
              distanceName={activeDist.name}
              aidStations={activeDist.aidStations}
              raceStartMinutes={activeDist.raceStartMinutes}
            />

            {activeDist.profileData.track && activeDist.profileData.meta && activeDist.profileData.track.length >= 2 && (
              <TrackMap
                key={activeDist.id}
                track={activeDist.profileData.track}
                startLat={activeDist.profileData.meta.startLat}
                startLon={activeDist.profileData.meta.startLon}
              />
            )}

            {activeDist.aidStations.length > 0 && (
              <TimeChart
                stations={activeDist.aidStations}
                points={activeDist.profileData.points}
                raceStartMinutes={activeDist.raceStartMinutes}
              />
            )}
          </div>
        )}

        {/* ── Участники ── */}
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
