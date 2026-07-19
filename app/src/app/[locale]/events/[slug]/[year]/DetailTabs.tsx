"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Icon } from "@/components/IconSprite";
import { fullName } from "@/lib/user";

type Tab = "course" | "equipment" | "participants";

type Registration = {
  id: string;
  user: { firstName: string; lastName: string };
  distance: { name: string };
  bibNumber: number | null;
};

type Props = {
  courseIntro: string;
  equipment: string[];
  registrations: Registration[];
};

export function DetailTabs({ courseIntro, equipment, registrations }: Props) {
  const t = useTranslations("EventDetail");
  const [tab, setTab] = useState<Tab>("course");

  const tabs: { id: Tab; label: string }[] = [
    { id: "course", label: t("courseTitle") },
    { id: "equipment", label: t("equipmentTitle") },
    { id: "participants", label: t("participantsTitle") },
  ];

  return (
    <div className="rounded-[var(--radius-m)] border border-border bg-surface">
      <div className="flex gap-0 overflow-x-auto border-b border-border px-4">
        {tabs.map(({ id, label }) => (
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
