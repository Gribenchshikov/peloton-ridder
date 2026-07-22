"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { type SizeRow, DEFAULT_SIZE_ROWS } from "@/types/sizeTable";

export function SizeGuideModal({ rows }: { rows?: SizeRow[] }) {
  const t = useTranslations("Registration");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const data = rows && rows.length > 0 ? rows : DEFAULT_SIZE_ROWS;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs font-semibold text-ember hover:underline"
      >
        {t("sizeGuideLink")} →
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current?.close(); }}
        className="w-full max-w-sm rounded-[var(--radius-m)] border border-border bg-surface p-0 shadow-xl backdrop:bg-black/40 open:flex open:flex-col"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-base font-bold text-ink">{t("sizeGuideTitle")}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="text-ink-faint hover:text-ink"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="overflow-x-auto px-5 py-4">
          <p className="mb-3 text-xs text-ink-faint">{t("sizeGuideNote")}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-ink-faint">
                <th className="pb-2 pr-4">{t("sizeGuideColSize")}</th>
                <th className="pb-2 pr-4">{t("sizeGuideColChest")}</th>
                <th className="pb-2 pr-4">{t("sizeGuideColWaist")}</th>
                <th className="pb-2">{t("sizeGuideColHip")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.size} className="border-b border-border last:border-0">
                  <td className="py-2 pr-4 font-bold text-ink">{row.size}</td>
                  <td className="py-2 pr-4 tabular-nums text-ink-soft">{row.chest}</td>
                  <td className="py-2 pr-4 tabular-nums text-ink-soft">{row.waist}</td>
                  <td className="py-2 tabular-nums text-ink-soft">{row.hip}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-ink-faint">{t("sizeGuideCm")}</p>
        </div>
      </dialog>
    </>
  );
}
