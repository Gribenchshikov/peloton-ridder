"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MerchForm, type MerchDefaults } from "../MerchForm";
import { MerchRow } from "../MerchRow";

export function MerchSection({
  eventId,
  items,
}: {
  eventId: string;
  items: (MerchDefaults & { id: string })[];
}) {
  const t = useTranslations("Admin");
  const [formKey, setFormKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-ink">{t("merchTitle")}</h2>

      {items.length === 0 && !addOpen ? (
        <p className="text-sm text-ink-faint">{t("merchEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <MerchRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {addOpen ? (
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{t("addMerchTitle")}</span>
            <button type="button" onClick={() => setAddOpen(false)} className="text-xs text-ink-faint hover:text-ink">Отмена</button>
          </div>
          <MerchForm
            key={formKey}
            mode="create"
            eventId={eventId}
            onSuccess={() => { setFormKey((k) => k + 1); setAddOpen(false); }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="self-start rounded-[var(--radius-s)] border border-dashed border-border px-4 py-2 text-sm font-semibold text-ink-faint transition-colors hover:border-ink-soft hover:text-ink"
        >
          + {t("addMerchTitle")}
        </button>
      )}
    </section>
  );
}
