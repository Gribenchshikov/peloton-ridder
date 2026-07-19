"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { DistanceForm, type DistanceDefaults } from "../DistanceForm";
import { DistanceRow } from "../DistanceRow";
import type { AidStation } from "@/types/aidStation";

export function DistancesSection({
  eventId,
  distances,
}: {
  eventId: string;
  distances: (DistanceDefaults & { id: string; hasProfile?: boolean; gpxUrl?: string | null; aidStations?: AidStation[] | null })[];
}) {
  const t = useTranslations("Admin");
  const [formKey, setFormKey] = useState(0);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-lg font-bold text-ink">{t("distancesTitle")}</h2>

      {distances.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("distancesEmpty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {distances.map((distance) => (
            <DistanceRow key={distance.id} distance={distance} />
          ))}
        </div>
      )}

      <div className="rounded-[var(--radius-m)] border border-dashed border-border p-5">
        <h3 className="font-display text-base font-bold text-ink">{t("addDistanceTitle")}</h3>
        <div className="mt-3">
          <DistanceForm key={formKey} mode="create" eventId={eventId} onSuccess={() => setFormKey((k) => k + 1)} />
        </div>
      </div>
    </section>
  );
}
