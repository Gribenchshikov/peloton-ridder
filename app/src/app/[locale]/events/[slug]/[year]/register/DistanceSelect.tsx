"use client";

import { useActionState, useState, useTransition } from "react";
import { checkPromoAction } from "@/lib/promoActions";
import { parseParticipantRules } from "@/types/participantRules";
import { type SizeRow } from "@/types/sizeTable";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { groupDistancesByDiscipline } from "@/lib/distanceLabel";
import { DistanceInfo } from "@/components/DistanceInfo";
import { createRegistrationAction, type CreateRegistrationState } from "./actions";
import { ContactOrganizerButton } from "./ContactOrganizerButton";
import { SizeGuideModal } from "./SizeGuideModal";

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;
type Size = (typeof SIZES)[number];

type ParticipantRule = { label: string; minAge: number | null; maxAge: number | null };

type DistanceOption = {
  id: string;
  discipline: string | null;
  name: string;
  km: number;
  price: number;
  minAge: number | null;
  maxAge: number | null;
  participantsPerSlot: number;
  participantRules: unknown;
  capacity: number;
  taken: number;
  requiresQualification: boolean;
  qualificationNote: string | null;
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
  sizeTableRows,
  hasBirthDate,
  defaultTshirtSize,
  transferPrice,
  location,
  defaultClubId,
}: {
  eventId: string;
  locale: string;
  distances: DistanceOption[];
  merchItems: MerchItem[];
  clubs: RunningClub[];
  sizeTableRows?: SizeRow[];
  hasBirthDate: boolean;
  defaultTshirtSize?: string | null;
  transferPrice?: number | null;
  location?: string | null;
  defaultClubId?: string | null;
}) {
  const t = useTranslations("Registration");
  const boundAction = createRegistrationAction.bind(null, locale);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [selected, setSelected] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Record<string, Size>>(() => {
    const valid = SIZES.find((s) => s === defaultTshirtSize);
    if (!valid) return {};
    return Object.fromEntries(
      merchItems.filter((m) => m.requiresSize).map((m) => [m.id, valid])
    );
  });
  const [promoInput, setPromoInput] = useState("");
  const [promoResult, setPromoResult] = useState<{ valid: boolean; label: string } | null>(null);
  const [promoChecking, startPromoCheck] = useTransition();

  const selectedDistance = distances.find((d) => d.id === selected);
  const extraCount = selectedDistance ? (selectedDistance.participantsPerSlot ?? 1) - 1 : 0;
  const extraRules = parseParticipantRules(selectedDistance?.participantRules);
  type ExtraParticipant = { firstName: string; lastName: string; birthDate: string };
  const [extraParticipants, setExtraParticipants] = useState<ExtraParticipant[]>([]);

  function ensureExtraLength(count: number) {
    setExtraParticipants((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) return [...prev, ...Array.from({ length: count - prev.length }, () => ({ firstName: "", lastName: "", birthDate: "" }))];
      return prev.slice(0, count);
    });
  }

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
                    onSelect={() => { setSelected(d.id); ensureExtraLength((d.participantsPerSlot ?? 1) - 1); }}
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
                onSelect={() => { setSelected(d.id); ensureExtraLength((d.participantsPerSlot ?? 1) - 1); }}
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
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-ink">{item.name}</span>
                  <SizeGuideModal rows={sizeTableRows} />
                </div>
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
              {defaultTshirtSize && sizes[item.id] === defaultTshirtSize && (
                <p className="text-xs text-ink-faint">{t("sizeFromProfile")}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Дополнительные участники — только для семейных/командных дистанций */}
      {selected !== null && extraCount > 0 && extraParticipants.map((p, idx) => {
        const rule = extraRules?.[idx + 1] ?? null;
        const label = rule?.label ?? `Участник ${idx + 2}`;
        const ageHint = rule
          ? [rule.minAge != null ? `от ${rule.minAge} лет` : null, rule.maxAge != null ? `до ${rule.maxAge} лет` : null].filter(Boolean).join(", ")
          : null;
        return (
          <div key={idx} className="flex flex-col gap-3 rounded-[var(--radius-s)] border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                {label}
                {ageHint && <span className="ml-2 font-normal normal-case tracking-normal text-ink-faint">({ageHint})</span>}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-ink-soft">Имя *</label>
                <input
                  type="text"
                  name={`extra_firstName_${idx}`}
                  required
                  value={p.firstName}
                  onChange={(e) => setExtraParticipants((prev) => prev.map((x, i) => i === idx ? { ...x, firstName: e.target.value } : x))}
                  className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-ink-soft">Фамилия *</label>
                <input
                  type="text"
                  name={`extra_lastName_${idx}`}
                  required
                  value={p.lastName}
                  onChange={(e) => setExtraParticipants((prev) => prev.map((x, i) => i === idx ? { ...x, lastName: e.target.value } : x))}
                  className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink-soft">Дата рождения *</label>
              <input
                type="date"
                name={`extra_birthDate_${idx}`}
                required
                max={new Date().toISOString().slice(0, 10)}
                value={p.birthDate}
                onChange={(e) => setExtraParticipants((prev) => prev.map((x, i) => i === idx ? { ...x, birthDate: e.target.value } : x))}
                className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
              />
            </div>
          </div>
        );
      })}

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
            <Link href="/account" className="ml-2 text-xs font-normal text-ember hover:underline">
              {t("clubRegisterCta")}
            </Link>
          </label>
          <select
            name="runningClubId"
            defaultValue={defaultClubId ?? ""}
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

      {/* Birth date — shown only when not set in profile */}
      {!hasBirthDate && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-soft">
            {t("birthDateLabel")}
            <span className="ml-1.5 text-xs font-bold text-danger">*</span>
          </label>
          <input
            type="date"
            name="birthDate"
            required
            max={new Date().toISOString().slice(0, 10)}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
          <p className="text-xs text-ink-faint">{t("birthDateHint")}</p>
        </div>
      )}

      {/* Errors */}
      {state.error === "registrations_closed" && <p className="text-sm text-danger">{t("errorRegistrationsClosed")}</p>}
      {state.error === "full" && <p className="text-sm text-danger">{t("errorFull")}</p>}
      {state.error === "closed" && <p className="text-sm text-danger">{t("errorClosed")}</p>}
      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}
      {state.error === "unverified" && <p className="text-sm text-danger">{t("errorEmailUnverified")}</p>}
      {state.error === "registration_blocked" && (
        <div className="rounded-[var(--radius-s)] border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">{t("errorRegistrationBlocked")}</p>
          <div className="mt-3">
            <ContactOrganizerButton eventId={eventId} />
          </div>
        </div>
      )}
      {state.error === "missing_size" && <p className="text-sm text-danger">{t("errorMissingSize")}</p>}
      {state.error === "age_required" && <p className="text-sm text-danger">{t("errorAgeRequired")}</p>}
      {state.error === "age_too_young" && <p className="text-sm text-danger">{t("errorAgeTooYoung")}</p>}
      {state.error === "age_too_old" && <p className="text-sm text-danger">{t("errorAgeTooOld")}</p>}
      {state.error === "extra_age_required" && <p className="text-sm text-danger">Укажите дату рождения для всех участников слота.</p>}
      {state.error === "extra_age_too_young" && <p className="text-sm text-danger">Один из дополнительных участников не соответствует минимальному возрасту для этой дистанции.</p>}
      {state.error === "extra_age_too_old" && <p className="text-sm text-danger">Один из дополнительных участников превышает максимальный возраст для этой дистанции.</p>}
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

      {/* Transfer option — below submit, orange accent */}
      {transferPrice && location && (
        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-s)] border border-ember/30 bg-ember/5 px-4 py-3 transition-colors has-[:checked]:border-ember has-[:checked]:bg-ember/10">
          <input
            type="checkbox"
            name="includesTransfer"
            value="true"
            className="mt-0.5 accent-ember"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-ember">{t("transferTitle")}</span>
            <span className="text-xs text-ink-soft">{t("transferRoute", { location })}</span>
          </div>
          <span className="ml-auto shrink-0 text-sm font-bold text-ember">
            +{transferPrice.toLocaleString("ru-KZ")} ₸
          </span>
        </label>
      )}
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
      {distance.requiresQualification && distance.qualificationNote && (
        <p className="ml-9 text-xs text-warn">
          {t("qualificationRequired")}{" "}
          <span className="text-ink-soft">{distance.qualificationNote}</span>
        </p>
      )}
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
