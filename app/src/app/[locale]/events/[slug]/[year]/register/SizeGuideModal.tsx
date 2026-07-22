"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

const ROWS = [
  { size: "XS",  chest: "80–84", waist: "62–66", hip: "86–90"  },
  { size: "S",   chest: "84–88", waist: "66–70", hip: "90–94"  },
  { size: "M",   chest: "88–92", waist: "70–74", hip: "94–98"  },
  { size: "L",   chest: "92–96", waist: "74–78", hip: "98–102" },
  { size: "XL",  chest: "96–100", waist: "78–82", hip: "102–106" },
  { size: "XXL", chest: "100–108", waist: "82–90", hip: "106–114" },
];

export function SizeGuideModal({ externalUrl }: { externalUrl?: string | null }) {
  const t = useTranslations("Registration");
  const dialogRef = useRef<HTMLDialogElement>(null);

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
              {ROWS.map((row) => (
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

        {externalUrl && (
          <div className="border-t border-border px-5 py-3">
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-ember hover:underline"
            >
              {t("sizeGuideExternal")} →
            </a>
          </div>
        )}
      </dialog>
    </>
  );
}
