"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { SelectField } from "@/components/SelectField";
import { createMassEventAction, updateMassEventAction, type MassActionState } from "./massEventActions";

const STATUS_VALUES = ["DRAFT", "OPEN", "CLOSED", "COMPLETED"] as const;
const initialState: MassActionState = {};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

type MassDefaults = {
  year: number;
  dateISO: Date;
  location: string;
  locationUrl: string | null;
  status: string;
  isFeatured: boolean;
  coverImageUrl: string | null;
  raceName: string;
};

type Props =
  | { mode: "create"; locale: string; massRaces: { id: string; name: string }[]; onCreated?: (eventId: string) => void }
  | { mode: "edit"; eventId: string; defaults: MassDefaults };

export function MassEventForm(props: Props) {
  const t = useTranslations("Admin");
  const tAuth = useTranslations("Auth");
  const tStatus = useTranslations("Status");

  const boundAction =
    props.mode === "create"
      ? createMassEventAction.bind(null, props.locale)
      : updateMassEventAction.bind(null, props.eventId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const d = props.mode === "edit" ? props.defaults : undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(d?.coverImageUrl ?? null);
  const [useExisting, setUseExisting] = useState(false);

  useEffect(() => {
    if (state.eventId && props.mode === "create" && props.onCreated) {
      props.onCreated(state.eventId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.eventId]);

  const massRaces = props.mode === "create" ? props.massRaces : [];

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5">
      <p className="text-sm text-ink-soft">
        Культмассовое мероприятие без регистрации, результатов и финишного протокола. На странице — описание, фото и видео.
      </p>

      {props.mode === "create" && massRaces.length > 0 && (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={useExisting}
            onChange={(e) => setUseExisting(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-ember"
          />
          <span className="font-semibold text-ink-soft">Повторить существующее мероприятие</span>
        </label>
      )}

      {props.mode === "create" && useExisting && massRaces.length > 0 ? (
        <SelectField
          label="Мероприятие"
          name="raceId"
          required
          options={massRaces.map((race) => ({ value: race.id, label: race.name }))}
        />
      ) : (
        <FormField
          label="Название"
          name="name"
          type="text"
          required
          defaultValue={d?.raceName}
        />
      )}

      <FormField label={t("fieldYear")} name="year" type="number" required defaultValue={d ? String(d.year) : undefined} />
      <FormField
        label={t("fieldDate")}
        name="dateISO"
        type="date"
        required
        defaultValue={d ? toDateInputValue(d.dateISO) : undefined}
      />
      <FormField label={t("fieldLocation")} name="location" type="text" required defaultValue={d?.location} />
      <FormField label={t("fieldLocationUrl")} name="locationUrl" type="url" optional defaultValue={d?.locationUrl ?? undefined} />
      <SelectField
        label={t("fieldStatus")}
        name="status"
        required
        defaultValue={d?.status ?? "DRAFT"}
        options={STATUS_VALUES.map((value) => ({ value, label: tStatus(value) }))}
      />
      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="isFeatured"
          defaultChecked={d?.isFeatured ?? false}
          className="h-4 w-4 cursor-pointer accent-ember"
        />
        <span className="font-semibold text-ink-soft">{t("fieldIsFeatured")}</span>
      </label>

      <div className="flex flex-col gap-1.5 text-sm">
        <span className="flex items-baseline gap-1.5 font-semibold text-ink-soft">
          {t("fieldCoverImage")}
          <span className="text-xs font-normal text-ink-faint">опционально</span>
        </span>
        {previewUrl && (
          <img src={previewUrl} alt="обложка" className="h-32 w-full rounded-[var(--radius-s)] object-cover" />
        )}
        <input
          ref={fileInputRef}
          name="coverImage"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreviewUrl(URL.createObjectURL(file));
          }}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink file:mr-3 file:rounded file:border-0 file:bg-ember/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-ember"
        />
        {d?.coverImageUrl && (
          <input type="hidden" name="currentCoverImageUrl" value={d.coverImageUrl} />
        )}
      </div>

      {state.success && <p className="text-sm text-spruce">{t("eventSaved")}</p>}
      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}
      {state.error === "duplicate" && <p className="text-sm text-danger">{t("errorDuplicate")}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? tAuth("submitting") : props.mode === "create" ? "Создать →" : t("saveSubmitCta")}
      </button>
    </form>
  );
}
