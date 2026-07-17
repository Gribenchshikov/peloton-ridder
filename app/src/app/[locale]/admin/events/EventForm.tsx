"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { SelectField } from "@/components/SelectField";
import { createEventAction, updateEventAction, type ActionState } from "./actions";

const STATUS_VALUES = ["DRAFT", "OPEN", "CLOSED", "COMPLETED"] as const;

const initialState: ActionState = {};

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

type EventDefaults = {
  year: number;
  dateISO: Date;
  location: string;
  status: string;
  registrationDeadline: Date;
  cancellationDeadline: Date;
  medicalCancellationDeadline: Date;
  transferPrice: number | null;
  resultsUrl: string | null;
  coverImageUrl: string | null;
  volunteerChatUrl: string | null;
};

type EventFormProps =
  | { mode: "create"; locale: string; races: { id: string; name: string }[] }
  | { mode: "edit"; eventId: string; raceName: string; defaults: EventDefaults };

export function EventForm(props: EventFormProps) {
  const t = useTranslations("Admin");
  const tAuth = useTranslations("Auth");
  const tStatus = useTranslations("Status");

  const boundAction =
    props.mode === "create" ? createEventAction.bind(null, props.locale) : updateEventAction.bind(null, props.eventId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const d = props.mode === "edit" ? props.defaults : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5">
      {props.mode === "create" ? (
        <SelectField
          label={t("fieldRace")}
          name="raceId"
          required
          options={props.races.map((race) => ({ value: race.id, label: race.name }))}
        />
      ) : (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink-soft">{t("fieldRace")}</span>
          <input
            value={props.raceName}
            disabled
            className="rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-2.5 text-ink-faint"
          />
        </label>
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
      <SelectField
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
      <FormField
        label={t("fieldTransferPrice")}
        name="transferPrice"
        type="number"
        defaultValue={d?.transferPrice != null ? String(d.transferPrice) : undefined}
      />
      <FormField label={t("fieldResultsUrl")} name="resultsUrl" type="url" defaultValue={d?.resultsUrl ?? undefined} />
      <FormField label={t("fieldCoverImageUrl")} name="coverImageUrl" type="url" defaultValue={d?.coverImageUrl ?? undefined} />
      <FormField
        label={t("fieldVolunteerChatUrl")}
        name="volunteerChatUrl"
        type="url"
        defaultValue={d?.volunteerChatUrl ?? undefined}
      />

      {state.success && <p className="text-sm text-spruce">{t("eventSaved")}</p>}
      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}
      {state.error === "duplicate" && <p className="text-sm text-danger">{t("errorDuplicate")}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? tAuth("submitting") : props.mode === "create" ? t("createSubmitCta") : t("saveSubmitCta")}
      </button>
    </form>
  );
}
