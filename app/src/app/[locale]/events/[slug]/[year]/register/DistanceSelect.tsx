"use client";

import { useActionState, useState, useTransition } from "react";
import { checkPromoAction } from "@/lib/promoActions";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
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
  capacity: number;
  taken: number;
};

type MerchItem = {
  id: string;
  name: string;
  requiresSize: boolean;
};

type RunningClub = { id: string; name: string; city: string | null };

const initialState: CreateRegistrationState = {};

export function DistanceSelect({
  eventId,
  locale,
  distances,
  merchItems,
  clubs,
}: {
  eventId: string;
  locale: string;
  distances: DistanceOption[];
  merchItems: MerchItem[];
  clubs: RunningClub[];
}) {
  const t = useTranslations("Registration");
  const boundAction = createRegistrationAction.bind(null, locale);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [selected, setSelected] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, Size>>({});
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; label: string } | null>(null);
  const [promoChecking, startPromoCheck] = useTransition();

  const { disciplines, noDiscipline: noDisciplineDistances } = groupDistancesByDiscipline(distances);

  function handlePromoCheck() {
    startPromoCheck(async () => {
      const result = await checkPromoAction(promoInput, eventId);
      if (result.valid) {
        const label = result.discountType === "PERCENT"
          ? `−${result.discountValue}%`
          : `−${result.discountValue} ₸`;
        setPromoResult({ valid: true, label });
      } else {
        setPromoResult({ valid: false, label: result.error });
      }
    });
  }

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

      {/* Promo code */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-soft">
          {t("promoLabel")}
          <span className="ml-1.5 text-xs font-normal text-ink-faint">{t("clubOptional")}</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            name="promoCode"
            value={promoInput}
            onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoResult(null); }}
            placeholder="RIDDER2026"
            className="flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 font-mono text-sm uppercase text-ink focus:border-ember focus:outline-none"
          />
          <button
            type="button"
            onClick={handlePromoCheck}
            disabled={promoChecking || !promoInput.trim()}
            className="rounded-[var(--radius-s)] border border-border px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-50"
          >
            {t("promoApply")}
          </button>
        </div>
        {promoResult && (
          <p className={`text-sm font-semibold ${promoResult.valid ? "text-spruce" : "text-danger"}`}>
            {promoResult.valid ? `✓ ${promoResult.label}` : t(`promoError_${promoResult.label}`)}
          </p>
        )}
      </div>

      {/* Running club (optional) */}
      {clubs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-soft">
            {t("clubLabel")}
            <span className="ml-1.5 text-xs font-normal text-ink-faint">{t("clubOptional")}</span>
          </label>
          <select
            name="runningClubId"
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          >
            <option value="">{t("clubNone")}</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.city ? ` (${c.city})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Errors */}
      {state.error === "registrations_closed" && <p className="text-sm text-danger">{t("errorRegistrationsClosed")}</p>}
      {state.error === "full" && <p className="text-sm text-danger">{t("errorFull")}</p>}
      {state.error === "closed" && <p className="text-sm text-danger">{t("errorClosed")}</p>}
      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}
      {state.error === "unverified" && <p className="text-sm text-danger">{t("errorEmailUnverified")}</p>}
      {state.error === "registration_blocked" && <p className="text-sm text-danger">{t("errorRegistrationBlocked")}</p>}
      {state.error === "missing_size" && <p className="text-sm text-danger">{t("errorMissingSize")}</p>}
      {state.error === "age_required" && <p className="text-sm text-danger">{t("errorAgeRequired")}</p>}
      {state.error === "age_too_young" && <p className="text-sm text-danger">{t("errorAgeTooYoung")}</p>}
      {state.error === "age_too_old" && <p className="text-sm text-danger">{t("errorAgeTooOld")}</p>}
      {state.error === "promo_invalid" && <p className="text-sm text-danger">{t("promoError_not_found")}</p>}
      {state.error === "promo_expired" && <p className="text-sm text-danger">{t("promoError_expired")}</p>}
      {state.error === "promo_exhausted" && <p className="text-sm text-danger">{t("promoError_exhausted")}</p>}

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
  const t = useTranslations("Registration");
  const tW = useTranslations("Waitlist");
  const params = useParams<{ locale: string; slug: string; year: string }>();
  const remaining = distance.capacity - distance.taken;
  const isFull = remaining <= 0;
  const waitlistHref = `/${params.locale}/events/${params.slug}/${params.year}/waitlist?distanceId=${distance.id}`;

  return (
    <div className="flex flex-col gap-1">
      <label
        className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius-s)] border px-3 py-2.5 transition-colors ${
          isFull
            ? "cursor-not-allowed border-border bg-surface-2 opacity-50"
            : selected
            ? "border-ember bg-ember/5"
            : "border-border bg-surface-2"
        }`}
      >
        <input
          type="radio"
          name="distanceId"
          value={distance.id}
          checked={selected}
          onChange={onSelect}
          disabled={isFull}
          className="accent-ember"
        />
        <DistanceInfo
          name={distance.name}
          km={distance.km}
          price={distance.price}
          minAge={distance.minAge}
          maxAge={distance.maxAge}
        />
        <div className="ml-auto shrink-0 text-right">
          {isFull ? (
            <span className="text-xs font-bold uppercase tracking-wide text-danger">{t("slotsFull")}</span>
          ) : remaining <= 10 ? (
            <span className="text-xs font-semibold text-warn">{t("slotsLeft", { count: remaining })}</span>
          ) : null}
        </div>
      </label>
      {isFull && (
        <a
          href={waitlistHref}
          className="ml-9 text-xs font-semibold text-ember hover:underline"
        >
          {tW("joinCta")} →
        </a>
      )}
    </div>
  );
}
