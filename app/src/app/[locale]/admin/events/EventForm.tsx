"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { SelectField } from "@/components/SelectField";
import { useRouter } from "@/i18n/navigation";
import { createEventAction, updateEventAction, type ActionState } from "./actions";
import { toDateInputValue } from "@/lib/dates";
import { publicAssetUrl } from "@/lib/publicAssetUrl";
import { submitRegisteredForm, useEventSaveRegistration } from "./[id]/EventSaveBar";

const STATUS_VALUES = ["DRAFT", "OPEN", "CLOSED", "COMPLETED"] as const;

const initialState: ActionState = {};

type EventDefaults = {
  year: number;
  dateISO: Date;
  location: string;
  locationUrl: string | null;
  status: string;
  registrationDeadline: Date;
  cancellationDeadline: Date;
  medicalCancellationDeadline: Date;
  transferPrice: number | null;
  isFeatured: boolean;
  resultsUrl: string | null;
  coverImageUrl: string | null;
  challengeWindowEnd: Date | null;
  isChallenge: boolean;
};

type EventFormProps =
  | { mode: "create"; locale: string; races: { id: string; name: string }[]; onCreated?: (eventId: string) => void; submitLabel?: string }
  | { mode: "edit"; eventId: string; races: { id: string; name: string }[]; currentRaceId: string; raceName: string; defaults: EventDefaults; submitLabel?: string };

export function EventForm(props: EventFormProps) {
  const t = useTranslations("Admin");
  const tAuth = useTranslations("Auth");
  const tStatus = useTranslations("Status");
  const router = useRouter();

  const boundAction =
    props.mode === "create" ? createEventAction.bind(null, props.locale) : updateEventAction.bind(null, props.eventId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const d = props.mode === "edit" ? props.defaults : undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(publicAssetUrl(d?.coverImageUrl) ?? null);
  const [transferEnabled, setTransferEnabled] = useState(d?.transferPrice != null);
  const [bulkState, setBulkState] = useState<ActionState>({});
  const displayState = bulkState.error || bulkState.success ? bulkState : state;
  const { hideInlineSave } = useEventSaveRegistration(
    props.mode === "edit" ? `event-${props.eventId}` : "",
    async () => {
      if (props.mode !== "edit") return { success: true };
      const result = await submitRegisteredForm(formRef.current, (prev, fd) =>
        updateEventAction(props.eventId, prev, fd),
      );
      setBulkState(result);
      return result;
    },
  );

  useEffect(() => {
    if (state.eventId && props.mode === "create" && props.onCreated) {
      props.onCreated(state.eventId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.eventId]);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5">
      {props.mode === "create" ? (
        <SelectField
          label={t("fieldRace")}
          name="raceId"
          required
          options={props.races.map((race) => ({ value: race.id, label: race.name }))}
        />
      ) : (
        <>
          <SelectField
            label={t("fieldRace")}
            name="raceId"
            required
            defaultValue={props.currentRaceId}
            options={props.races.map((race) => ({ value: race.id, label: race.name }))}
          />
          <FormField
            label="Переименовать трассу (опционально)"
            name="raceName"
            type="text"
            optional
            defaultValue={props.raceName}
          />
        </>
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
        key={d?.status ?? "DRAFT"}
        label={t("fieldStatus")}
        name="status"
        required
        defaultValue={d?.status ?? "DRAFT"}
        options={STATUS_VALUES.map((value) => ({ value, label: tStatus(value) }))}
      />
      <FormField
        label={t("fieldRegistrationDeadline")}
        name="registrationDeadline"
        type="date"
        required
        defaultValue={d ? toDateInputValue(d.registrationDeadline) : undefined}
      />
      <FormField
        label={t("fieldCancellationDeadline")}
        name="cancellationDeadline"
        type="date"
        required
        defaultValue={d ? toDateInputValue(d.cancellationDeadline) : undefined}
      />
      <FormField
        label={t("fieldMedicalCancellationDeadline")}
        name="medicalCancellationDeadline"
        type="date"
        required
        defaultValue={d ? toDateInputValue(d.medicalCancellationDeadline) : undefined}
      />
      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            checked={transferEnabled}
            onChange={(e) => setTransferEnabled(e.target.checked)}
            className="h-4 w-4 cursor-pointer accent-ember"
          />
          <span className="font-semibold text-ink-soft">{t("fieldTransferEnabled")}</span>
        </label>
        {transferEnabled && (
          <FormField
            label={t("fieldTransferPrice")}
            name="transferPrice"
            type="number"
            defaultValue={d?.transferPrice != null ? String(d.transferPrice) : undefined}
          />
        )}
        {!transferEnabled && <input type="hidden" name="transferPrice" value="" />}
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="isFeatured"
          defaultChecked={d?.isFeatured ?? false}
          className="h-4 w-4 cursor-pointer accent-ember"
        />
        <span className="font-semibold text-ink-soft">{t("fieldIsFeatured")}</span>
      </label>

      <FormField label={t("fieldResultsUrl")} name="resultsUrl" type="url" optional defaultValue={d?.resultsUrl ?? undefined} />

      {d?.isChallenge && (
        <div className="flex flex-col gap-1.5 rounded-[var(--radius-s)] border border-ember/30 bg-ember/5 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ember">Онлайн-челлендж</p>
          <FormField
            label="Конец окна приёма результатов"
            name="challengeWindowEnd"
            type="date"
            optional
            defaultValue={d?.challengeWindowEnd ? toDateInputValue(d.challengeWindowEnd) : undefined}
          />
          <p className="text-xs text-ink-faint">Старт окна = дата события. Результаты Strava засчитываются до этой даты включительно.</p>
        </div>
      )}

      {/* Обложка забега — file upload */}
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
        <span className="text-xs text-ink-faint">JPEG, PNG или WebP · макс. 5 МБ</span>
        {(displayState.error === "invalidType" || displayState.error === "tooLarge") && (
          <p className="text-xs text-danger">
            {displayState.error === "tooLarge" ? "Файл слишком большой (макс. 5 МБ)" : "Только JPEG, PNG или WebP"}
          </p>
        )}
      </div>

      {displayState.success && <p className="text-sm text-spruce">{t("eventSaved")}</p>}
      {displayState.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}
      {displayState.error === "duplicate" && <p className="text-sm text-danger">{t("errorDuplicate")}</p>}

      {!hideInlineSave && (
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? tAuth("submitting") : (props.submitLabel ?? (props.mode === "create" ? t("createSubmitCta") : t("saveSubmitCta")))}
      </button>
      )}
    </form>
  );
}
