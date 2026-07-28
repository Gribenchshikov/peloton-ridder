"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { createDistanceAction, updateDistanceAction, type ActionState } from "./actions";
import { parseParticipantRules, type ParticipantRule } from "@/types/participantRules";

const initialState: ActionState = {};

export type DistanceDefaults = {
  discipline: string | null;
  name: string;
  km: number;
  gain: number | null;
  price: number;
  maxSlots: number | null;
  participantsPerSlot: number;
  participantRules: unknown;
  minAge: number | null;
  maxAge: number | null;
  cutoffMinutes: number | null;
  certification: string | null;
  certificationPoints: number | null;
  requiresQualification: boolean;
  qualificationNote: string | null;
  requiresInsurance: boolean;
  bibRangeStart: number;
  bibRangeEnd: number;
};

type DistanceFormProps =
  | { mode: "create"; eventId: string; onSuccess?: () => void }
  | { mode: "edit"; distanceId: string; defaults: DistanceDefaults; onSuccess?: () => void };

function defaultRules(n: number): ParticipantRule[] {
  if (n === 2) return [
    { label: "Взрослый", minAge: 18, maxAge: null },
    { label: "Ребёнок", minAge: 10, maxAge: 17 },
  ];
  return Array.from({ length: n }, (_, i) => ({ label: `Участник ${i + 1}`, minAge: null, maxAge: null }));
}

export function DistanceForm(props: DistanceFormProps) {
  const t = useTranslations("Admin");
  const tAuth = useTranslations("Auth");

  const d = props.mode === "edit" ? props.defaults : undefined;
  const [needsQual, setNeedsQual] = useState(d?.requiresQualification ?? false);
  const [slots, setSlots] = useState<number>(d?.participantsPerSlot ?? 1);
  const [rules, setRules] = useState<ParticipantRule[]>(() => {
    const parsed = parseParticipantRules(d?.participantRules);
    if (parsed) return parsed;
    if (d?.participantsPerSlot && d.participantsPerSlot > 1) return defaultRules(d.participantsPerSlot);
    return [];
  });

  const boundAction =
    props.mode === "create"
      ? createDistanceAction.bind(null, props.eventId)
      : updateDistanceAction.bind(null, props.distanceId);
  async function action(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const result = await boundAction(prevState, formData);
    if (result.success) props.onSuccess?.();
    return result;
  }
  const [state, formAction, pending] = useActionState(action, initialState);

  const inv = state.invalidFields;
  const isFamily = slots > 1;

  function handleSlotsChange(n: number) {
    const clamped = Math.max(1, Math.min(10, n));
    setSlots(clamped);
    if (clamped > 1) {
      if (rules.length !== clamped) setRules(defaultRules(clamped));
    } else {
      setRules([]);
    }
  }

  function updateRule(idx: number, field: keyof ParticipantRule, value: string) {
    setRules((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === "label") return { ...r, label: value };
      const num = value === "" ? null : parseInt(value, 10);
      return { ...r, [field]: isNaN(num as number) ? null : num };
    }));
  }

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormField label={t("fieldName")} name="name" type="text" required placeholder="например: Горная 21" defaultValue={d?.name} error={inv?.includes("name")} />
      <FormField label={t("fieldDiscipline")} name="discipline" type="text" optional placeholder="например: Trail Run" defaultValue={d?.discipline ?? undefined} error={inv?.includes("discipline")} />
      <FormField label={t("fieldKm")} name="km" type="number" step="0.01" required placeholder="например: 21.1" defaultValue={d ? String(d.km) : undefined} error={inv?.includes("km")} />
      <FormField label={t("fieldGain")} name="gain" type="number" optional placeholder="например: 800" defaultValue={d?.gain != null ? String(d.gain) : undefined} error={inv?.includes("gain")} />
      <FormField label={t("fieldPrice")} name="price" type="number" required placeholder="например: 5000" defaultValue={d ? String(d.price) : undefined} error={inv?.includes("price")} />
      <FormField label={t("fieldMaxSlots")} name="maxSlots" type="number" optional placeholder="например: 100" defaultValue={d?.maxSlots != null ? String(d.maxSlots) : undefined} error={inv?.includes("maxSlots")} />

      {/* Участники на слот */}
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label className="text-sm font-semibold text-ink">
          Участников в слоте
          <span className="ml-1.5 text-xs font-normal text-ink-faint">1 = обычная, 2+ = семейная/командная</span>
        </label>
        <input
          type="number"
          name="participantsPerSlot"
          min={1}
          max={10}
          value={slots}
          onChange={(e) => handleSlotsChange(parseInt(e.target.value, 10) || 1)}
          className="w-24 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ember focus:ring-1 focus:ring-ember"
        />
        <input type="hidden" name="participantRulesJson" value={isFamily ? JSON.stringify(rules) : ""} />
      </div>

      {/* Возрастные правила — по одному на каждого участника в слоте */}
      {isFamily && (
        <div className="flex flex-col gap-3 rounded-[var(--radius-s)] border border-ember/30 bg-ember/5 p-4 sm:col-span-2">
          <p className="text-xs font-bold uppercase tracking-widest text-ember">Правила для участников слота</p>
          {rules.map((rule, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_80px_80px] gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-ink-soft">Подпись</label>
                <input
                  type="text"
                  placeholder={idx === 0 ? "Взрослый" : "Ребёнок"}
                  value={rule.label}
                  onChange={(e) => updateRule(idx, "label", e.target.value)}
                  className="rounded-[var(--radius-s)] border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-ember"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-ink-soft">Мин. возраст</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  placeholder="—"
                  value={rule.minAge ?? ""}
                  onChange={(e) => updateRule(idx, "minAge", e.target.value)}
                  className="rounded-[var(--radius-s)] border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-ember"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-ink-soft">Макс. возраст</label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  placeholder="—"
                  value={rule.maxAge ?? ""}
                  onChange={(e) => updateRule(idx, "maxAge", e.target.value)}
                  className="rounded-[var(--radius-s)] border border-border bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-ember"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Возрастные лимиты — только для одиночных дистанций */}
      {!isFamily && (
        <>
          <FormField label={t("fieldMinAge")} name="minAge" type="number" optional placeholder="например: 18" defaultValue={d?.minAge != null ? String(d.minAge) : undefined} error={inv?.includes("minAge")} />
          <FormField label={t("fieldMaxAge")} name="maxAge" type="number" optional placeholder="например: 65" defaultValue={d?.maxAge != null ? String(d.maxAge) : undefined} error={inv?.includes("maxAge")} />
        </>
      )}

      <FormField
        label={t("fieldCutoffMinutes")}
        name="cutoffMinutes"
        type="number"
        optional
        placeholder="например: 480"
        defaultValue={d?.cutoffMinutes != null ? String(d.cutoffMinutes) : undefined}
        error={inv?.includes("cutoffMinutes")}
      />
      <div className="flex items-end gap-3 sm:col-span-2">
        <FormField label={t("fieldBibRangeStart")} name="bibRangeStart" type="number" required placeholder="1" defaultValue={d ? String(d.bibRangeStart) : undefined} error={inv?.includes("bibRangeStart")} />
        <FormField label={t("fieldBibRangeEnd")} name="bibRangeEnd" type="number" required placeholder="200" defaultValue={d ? String(d.bibRangeEnd) : undefined} error={inv?.includes("bibRangeEnd")} />
      </div>

      {/* Сертификация */}
      <FormField label={t("fieldCertification")} name="certification" type="text" optional placeholder="например: ITRA, WMRA" defaultValue={d?.certification ?? undefined} error={inv?.includes("certification")} />
      <FormField label={t("fieldCertificationPoints")} name="certificationPoints" type="number" optional placeholder="например: 45" defaultValue={d?.certificationPoints != null ? String(d.certificationPoints) : undefined} error={inv?.includes("certificationPoints")} />

      {/* Требования */}
      <div className="flex flex-col gap-3 sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="requiresInsurance"
            defaultChecked={d?.requiresInsurance}
            className="h-4 w-4 rounded border-border accent-ember"
          />
          <span className="text-sm font-semibold text-ink">{t("fieldRequiresInsurance")}</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="requiresQualification"
            defaultChecked={d?.requiresQualification}
            onChange={(e) => setNeedsQual(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-ember"
          />
          <span className="text-sm font-semibold text-ink">{t("fieldRequiresQualification")}</span>
        </label>

        {needsQual && (
          <FormField
            label={t("fieldQualificationNote")}
            name="qualificationNote"
            type="text"
            optional
            placeholder="например: финиш на Ridder Sky Race 2025"
            defaultValue={d?.qualificationNote ?? undefined}
            error={inv?.includes("qualificationNote")}
          />
        )}
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
        >
          {pending ? tAuth("submitting") : props.mode === "create" ? t("addDistanceCta") : t("saveSubmitCta")}
        </button>
      </div>
    </form>
  );
}
