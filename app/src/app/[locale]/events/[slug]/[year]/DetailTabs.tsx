"use client";

import { useState, useRef, useEffect } from "react";
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
import type { Result } from "@/generated/prisma/client";

type Tab = "about" | "regulation" | "results" | "participants" | "profile" | "dayprogram" | "howtoget" | "equipment";

type Registration = {
  id: string;
  user: { firstName: string; lastName: string };
  distance: { name: string } | null;
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
  eventPhotos?: string[];
  dayProgram: DayProgramItem[];
  howToGet: string;
  howToGetUrl?: string | null;
  locationUrl?: string | null;
  distanceEquipment: DistanceEquipment;
  regulationFiles: RegulationFile[];
  regulationBlocks: RegulationBlock[];
  waiverFiles: RegulationFile[];
  results: Result[];
  resultsUrl?: string | null;
  registrations: Registration[];
  distances?: DistanceWithProfile[];
  allDistances?: DistanceBasic[];
};

export function DetailTabs({
  courseIntro,
  aboutText,
  photoLinks,
  eventPhotos = [],
  dayProgram,
  howToGet,
  howToGetUrl,
  locationUrl,
  distanceEquipment,
  regulationFiles,
  regulationBlocks,
  waiverFiles,
  results,
  resultsUrl,
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
  const [resultsDistId, setResultsDistId] = useState<string>("all");
  const [resultsSearch, setResultsSearch] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const activeDist = distances.find((d) => d.id === activeDistId) ?? distances[0];

  const filesForLocale = regulationFiles.filter((f) => f.locale === locale);
  const waiverFilesForLocale = waiverFiles.filter((f) => f.locale === locale);
  const hasRegulation = filesForLocale.length > 0 || regulationBlocks.length > 0 || waiverFilesForLocale.length > 0;
  const aboutBody = aboutText || courseIntro;
  const hasEquipment = Object.keys(distanceEquipment).length > 0;

  const tabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: "about", label: t("aboutTitle") },
    { id: "regulation", label: t("regulationTitle") },
    { id: "results", label: t("resultsTabTitle") },
    { id: "dayprogram", label: t("dayProgramTitle"), hidden: dayProgram.length === 0 },
    { id: "howtoget", label: t("howToGetTitle"), hidden: !howToGet && !howToGetUrl && !locationUrl },
    { id: "equipment", label: t("equipmentTitle"), hidden: !hasEquipment },
    { id: "profile", label: t("courseProfileTitle"), hidden: !hasProfile },
    { id: "participants", label: t("participantsTitle") },
  ];

  const equipDist = allDistances.find((d) => d.id === equipDistId) ?? allDistances[0];
  const equipForDist = equipDist ? (distanceEquipment[equipDist.id] ?? { required: [], recommended: [] }) : { required: [], recommended: [] };

  const visibleTabs = tabs.filter((t) => !t.hidden);
  const currentTabIndex = visibleTabs.findIndex((t) => t.id === tab);

  function goToTab(index: number) {
    const clamped = Math.max(0, Math.min(visibleTabs.length - 1, index));
    setTab(visibleTabs[clamped].id);
    // scroll active tab button into view
    setTimeout(() => {
      const bar = tabBarRef.current;
      if (!bar) return;
      const btn = bar.children[clamped] as HTMLElement | undefined;
      btn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }, 0);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    goToTab(currentTabIndex + (dx < 0 ? 1 : -1));
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-border bg-surface">
      {/* Tab bar with prev/next arrows */}
      <div className="flex items-stretch border-b border-border">
        <button
          type="button"
          onClick={() => goToTab(currentTabIndex - 1)}
          disabled={currentTabIndex === 0}
          aria-label="Предыдущая вкладка"
          className="shrink-0 rounded-tl-[var(--radius-m)] border-r border-border bg-surface-2 px-3 text-base font-bold text-ink transition-colors hover:bg-surface hover:text-ember disabled:pointer-events-none disabled:opacity-25"
        >
          ←
        </button>
        <div ref={tabBarRef} className="flex min-w-0 flex-1 gap-0 overflow-x-auto scroll-smooth">
          {visibleTabs.map(({ id, label }) => (
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
        <button
          type="button"
          onClick={() => goToTab(currentTabIndex + 1)}
          disabled={currentTabIndex === visibleTabs.length - 1}
          aria-label="Следующая вкладка"
          className="shrink-0 rounded-tr-[var(--radius-m)] border-l border-border bg-surface-2 px-3 text-base font-bold text-ink transition-colors hover:bg-surface hover:text-ember disabled:pointer-events-none disabled:opacity-25"
        >
          →
        </button>
      </div>

      <div
        className="overflow-hidden p-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* ── О забеге ── */}
        {tab === "about" && (
          <div className="flex flex-col gap-6">
            {aboutBody ? (
              <p className="max-w-2xl whitespace-pre-line text-[1.02rem] leading-relaxed text-ink-soft break-words">
                {aboutBody}
              </p>
            ) : (
              <p className="text-sm text-ink-faint">{t("aboutEmpty")}</p>
            )}

            {photoLinks.length > 0 && (
              <div>
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">
                  {t("photoLinksLabel")}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photoLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group overflow-hidden rounded-[var(--radius-s)] border border-border bg-surface-2 transition-colors hover:border-ink-soft"
                    >
                      {link.coverUrl ? (
                        <div className="overflow-hidden">
                          <img
                            src={link.coverUrl}
                            alt={link.label}
                            className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-[4/3] items-center justify-center bg-surface-2">
                          <svg width="28" height="28" viewBox="0 0 15 15" fill="none" aria-hidden className="text-ink-faint">
                            <rect x="1" y="2" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                            <path d="M1 9l3.5-3.5L7 8l3-3 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="4.5" cy="5.5" r="1" fill="currentColor"/>
                          </svg>
                        </div>
                      )}
                      <div className="px-3 py-2 text-sm font-semibold text-ink">
                        {link.label} ↗
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {eventPhotos.length > 0 && (
              <div>
                <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">
                  {t("eventPhotosLabel")}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {eventPhotos.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxUrl(url)}
                      className="group overflow-hidden rounded-[var(--radius-s)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ember"
                    >
                      <img
                        src={url}
                        alt=""
                        className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lightbox */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            onClick={() => setLightboxUrl(null)}
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
              aria-label="Закрыть"
            >
              ✕
            </button>
            <img
              src={lightboxUrl}
              alt=""
              className="max-h-[90vh] max-w-[90vw] rounded-[var(--radius-s)] object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* ── Документы ── */}
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

            {waiverFilesForLocale.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                  {t("waiverFilesLabel")}
                </div>
                <div className="flex flex-col gap-2">
                  {waiverFilesForLocale.map((f, i) => (
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

        {/* ── Результаты ── */}
        {tab === "results" && (() => {
          const query = resultsSearch.trim().toLowerCase();
          const byDist = resultsDistId === "all" ? results : results.filter((r) => r.distanceId === resultsDistId);
          const visible = query
            ? byDist.filter((r) => {
                const bib = String(r.bibNumber);
                const name = r.name.toLowerCase();
                return name.includes(query) || bib.includes(query);
              })
            : byDist;
          return (
            <div className="flex flex-col gap-4">
              {resultsUrl && (
                <a
                  href={resultsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 self-start rounded-[var(--radius-s)] border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink-soft"
                >
                  {t("resultsExternalLink")} →
                </a>
              )}
              {results.length === 0 && !resultsUrl ? (
                <p className="text-sm text-ink-faint">{t("resultsEmpty")}</p>
              ) : results.length > 0 ? (
                <>
                  <div className="flex flex-col gap-3">
                    {allDistances.length > 1 && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setResultsDistId("all")}
                          className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${resultsDistId === "all" ? "bg-ember text-white" : "bg-surface-2 text-ink-soft hover:text-ink"}`}
                        >
                          {t("resultsAllDistances")}
                        </button>
                        {allDistances.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setResultsDistId(d.id)}
                            className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${resultsDistId === d.id ? "bg-ember text-white" : "bg-surface-2 text-ink-soft hover:text-ink"}`}
                          >
                            {d.name}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      type="search"
                      value={resultsSearch}
                      onChange={(e) => setResultsSearch(e.target.value)}
                      placeholder={t("resultsSearchPlaceholder")}
                      className="w-full max-w-xs rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-ember focus:outline-none"
                    />
                  </div>
                  {visible.length === 0 ? (
                    <p className="text-sm text-ink-faint">{t("resultsNoMatch")}</p>
                  ) : (
                    <div className="overflow-x-auto rounded-[var(--radius-s)] border border-border">
                      <table className="w-full min-w-[360px] text-sm">
                        <thead>
                          <tr className="border-b border-border bg-surface-2">
                            <th className="px-4 py-2.5 text-left font-semibold text-ink-faint tabular-nums">{t("resultsPlace")}</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-ink-faint tabular-nums">{t("resultsBib")}</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-ink-faint">{t("resultsName")}</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-ink-faint tabular-nums">{t("resultsTime")}</th>
                            <th className="px-4 py-2.5 text-left font-semibold text-ink-faint">{t("resultsCategory")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((r) => (
                            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                              <td className="px-4 py-2.5 font-bold tabular-nums text-ink">{r.place ?? "—"}</td>
                              <td className="px-4 py-2.5 tabular-nums text-ink-soft">{r.bibNumber}</td>
                              <td className="px-4 py-2.5 text-ink">{r.name}</td>
                              <td className="px-4 py-2.5 tabular-nums text-ink-soft">{r.time ?? "—"}</td>
                              <td className="px-4 py-2.5 text-ink-faint">{r.category ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          );
        })()}

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
          <div className="flex flex-col gap-5">
            {/* Место старта — prominent card */}
            {locationUrl && (
              <div className="flex flex-col gap-3 rounded-[var(--radius-m)] border border-ember/30 bg-ember/5 p-4">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-ember" aria-hidden>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("startLocationLabel")}</span>
                </div>
                <p className="text-sm text-ink-soft">{t("startLocationHint")}</p>
                <a
                  href={locationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 self-start rounded-[var(--radius-s)] bg-ember px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                  {t("startLocationCta")}
                </a>
              </div>
            )}

            {/* Описание + маршрут */}
            {(howToGet || howToGetUrl) && (
              <div className="flex flex-col gap-4">
                {howToGet ? (
                  <p className="max-w-2xl text-sm leading-relaxed text-ink-soft whitespace-pre-line break-words">
                    {howToGet}
                  </p>
                ) : null}
                {howToGetUrl && (
                  <a
                    href={howToGetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 self-start rounded-[var(--radius-s)] border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink-soft hover:bg-surface"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    {t("howToGetMapCta")}
                  </a>
                )}
              </div>
            )}

            {/* Fallback if nothing set */}
            {!howToGet && !howToGetUrl && !locationUrl && (
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
                        const predefined = EQUIPMENT_ITEMS.find((e) => e.key === key);
                        const custom = (equipForDist.customItems ?? []).find((i) => i.key === key);
                        const label = predefined?.label ?? custom?.label;
                        return label ? (
                          <li key={key} className="flex items-center gap-2.5 text-sm text-ink">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                            {label}
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
                        const predefined = EQUIPMENT_ITEMS.find((e) => e.key === key);
                        const custom = (equipForDist.customItems ?? []).find((i) => i.key === key);
                        const label = predefined?.label ?? custom?.label;
                        return label ? (
                          <li key={key} className="flex items-center gap-2.5 text-sm text-ink-soft">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-dawn" />
                            {label}
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
                          <td className="px-4 py-2.5 text-ink-soft">{r.distance?.name ?? "Трансфер"}</td>
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
