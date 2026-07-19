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

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-ink">{t("merchTitle")}</h2>

      {items.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("merchEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <MerchRow key={item.id} item={item} />
          ))}
        </div>
      )}

      <div className="rounded-[var(--radius-m)] border border-dashed border-border p-5">
        <h3 className="font-display text-base font-bold text-ink">{t("addMerchTitle")}</h3>
        <div className="mt-3">
          <MerchForm key={formKey} mode="create" eventId={eventId} onSuccess={() => setFormKey((k) => k + 1)} />
        </div>
      </div>
    </section>
  );
}
