"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { groupDistancesByDiscipline } from "@/lib/distanceLabel";
import { DistanceInfo } from "@/components/DistanceInfo";
import { createRegistrationAction, type CreateRegistrationState } from "./actions";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
type Size = (typeof SIZES)[number];

type DistanceOption = {
  id: string;
  discipline: string | null;
  name: string;
  km: number;
  price: number;
  minAge: number | null;
  maxAge: number | null;
};

type MerchItem = {
  id: string;
  name: string;
  requiresSize: boolean;
};

const initialState: CreateRegistrationState = {};

export function DistanceSelect({
  eventId,
  locale,
  distances,
  merchItems,
}: {
  eventId: string;
  locale: string;
  distances: DistanceOption[];
  merchItems: MerchItem[];
}) {
  const t = useTranslations("Registration");
  const boundAction = createRegistrationAction.bind(null, locale);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [selected, setSelected] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, Size>>({});

  const { disciplines, noDiscipline: noDisciplineDistances } = groupDistancesByDiscipline(distances);

  const sizeItems = merchItems.filter((m) => m.requiresSize);
  const autoItems = merchItems.filter((m) => !m.requiresSize);
  const allSizesChosen = sizeItems.every((m) => sizes[m.id]);
  const canSubmit = selected !== null && allSizesChosen;

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5">
      <input type="hidden" name="eventId" value={eventId} />

      {/* Distance selection */}
      <div className="flex flex-col gap-4">
        {disciplines.map((discipline) => (
          <div key={discipline}>
            <div className="text-xs font-bold uppercase tracking-wide text-ember">{discipline}</div>
            <div className="mt-2 flex flex-col gap-2">
              {distances
                .filter((d) => d.discipline === discipline)
                .map((d) => (
                  <DistanceOptionRow
                    key={d.id}
                    distance={d}
                    selected={selected === d.id}
                    onSelect={() => setSelected(d.id)}
                  />
                ))}
            </div>
          </div>
        ))}
        {noDisciplineDistances.length > 0 && (
          <div className="flex flex-col gap-2">
            {noDisciplineDistances.map((d) => (
              <DistanceOptionRow
                key={d.id}
                distance={d}
                selected={selected === d.id}
                onSelect={() => setSelected(d.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Merch — shown after a distance is selected */}
      {selected !== null && merchItems.length > 0 && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-s)] border border-border bg-surface-2 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{t("selectMerchTitle")}</p>

          {/* Auto-included items (no size) */}
          {autoItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm text-ink">
              <span className="text-success">✓</span>
              <span>{item.name}</span>
              <span className="ml-auto text-xs text-ink-faint">{t("includedLabel")}</span>
            </div>
          ))}

          {/* Size-required items */}
          {sizeItems.map((item) => (
            <div key={item.id} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-ink">{item.name}</span>
                {!sizes[item.id] && <span className="text-xs text-warn">{t("selectSizeLabel")}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SIZES.map((size) => (
                  <label
                    key={size}
                    className={`flex h-8 min-w-[2.5rem] cursor-pointer items-center justify-center rounded-[var(--radius-s)] border px-2 text-xs font-bold transition-colors ${
                      sizes[item.id] === size
                        ? "border-ember bg-ember text-white"
                        : "border-border bg-surface text-ink hover:border-ember/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`merch_size_${item.id}`}
                      value={size}
                      checked={sizes[item.id] === size}
                      onChange={() => setSizes((s) => ({ ...s, [item.id]: size }))}
                      className="sr-only"
                    />
                    {size}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {state.error === "full" && <p className="text-sm text-danger">{t("errorFull")}</p>}
      {state.error === "closed" && <p className="text-sm text-danger">{t("errorClosed")}</p>}
      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}
      {state.error === "unverified" && <p className="text-sm text-danger">{t("errorEmailUnverified")}</p>}
      {state.error === "missing_size" && <p className="text-sm text-danger">{t("errorMissingSize")}</p>}

      <button
        type="submit"
        disabled={pending || !canSubmit}
        className="rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submitCta")}
      </button>
    </form>
  );
}

function DistanceOptionRow({
  distance,
  selected,
  onSelect,
}: {
  distance: DistanceOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-s)] border px-3 py-2.5 transition-colors ${
        selected ? "border-ember bg-ember/5" : "border-border bg-surface-2"
      }`}
    >
      <input type="radio" name="distanceId" value={distance.id} checked={selected} onChange={onSelect} className="accent-ember" />
      <DistanceInfo
        name={distance.name}
        km={distance.km}
        price={distance.price}
        minAge={distance.minAge}
        maxAge={distance.maxAge}
      />
    </label>
  );
}
