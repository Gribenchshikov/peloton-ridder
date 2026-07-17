"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { createDistanceAction, updateDistanceAction, type ActionState } from "./actions";

const initialState: ActionState = {};

export type DistanceDefaults = {
  discipline: string | null;
  name: string;
  km: number;
  gain: number | null;
  price: number;
  minAge: number | null;
  maxAge: number | null;
  cutoffMinutes: number | null;
  bibRangeStart: number;
  bibRangeEnd: number;
};

type DistanceFormProps =
  | { mode: "create"; eventId: string; onSuccess?: () => void }
  | { mode: "edit"; distanceId: string; defaults: DistanceDefaults; onSuccess?: () => void };

export function DistanceForm(props: DistanceFormProps) {
  const t = useTranslations("Admin");
  const tAuth = useTranslations("Auth");

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

  const d = props.mode === "edit" ? props.defaults : undefined;

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormField label={t("fieldName")} name="name" type="text" required defaultValue={d?.name} />
      <FormField label={t("fieldDiscipline")} name="discipline" type="text" defaultValue={d?.discipline ?? undefined} />
      <FormField label={t("fieldKm")} name="km" type="number" step="0.01" required defaultValue={d ? String(d.km) : undefined} />
      <FormField label={t("fieldGain")} name="gain" type="number" defaultValue={d?.gain != null ? String(d.gain) : undefined} />
      <FormField label={t("fieldPrice")} name="price" type="number" required defaultValue={d ? String(d.price) : undefined} />
      <FormField
        label={t("fieldCutoffMinutes")}
        name="cutoffMinutes"
        type="number"
        defaultValue={d?.cutoffMinutes != null ? String(d.cutoffMinutes) : undefined}
      />
      <FormField label={t("fieldMinAge")} name="minAge" type="number" defaultValue={d?.minAge != null ? String(d.minAge) : undefined} />
      <FormField label={t("fieldMaxAge")} name="maxAge" type="number" defaultValue={d?.maxAge != null ? String(d.maxAge) : undefined} />
      <FormField
        label={t("fieldBibRangeStart")}
        name="bibRangeStart"
        type="number"
        required
        defaultValue={d ? String(d.bibRangeStart) : undefined}
      />
      <FormField
        label={t("fieldBibRangeEnd")}
        name="bibRangeEnd"
        type="number"
        required
        defaultValue={d ? String(d.bibRangeEnd) : undefined}
      />

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
