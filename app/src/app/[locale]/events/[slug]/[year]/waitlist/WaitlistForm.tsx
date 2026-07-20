"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { joinWaitlistAction, type JoinWaitlistState } from "./actions";
import { AuthSuccessCard } from "@/components/AuthSuccessCard";

const initialState: JoinWaitlistState = {};

type Distance = { id: string; name: string; km: number };

export function WaitlistForm({
  eventId,
  distances,
  preselectedDistanceId,
  locale,
}: {
  eventId: string;
  distances: Distance[];
  preselectedDistanceId?: string;
  locale: string;
}) {
  const t = useTranslations("Waitlist");
  void locale;
  const [state, formAction, pending] = useActionState(joinWaitlistAction, initialState);

  if (state.success) {
    return <AuthSuccessCard title={t("successTitle")} text={t("successText")} />;
  }

  const defaultDistance =
    preselectedDistanceId && distances.find((d) => d.id === preselectedDistanceId)
      ? preselectedDistanceId
      : distances[0]?.id;

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5">
      <input type="hidden" name="eventId" value={eventId} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-soft">{t("distanceLabel")}</label>
        <select
          name="distanceId"
          defaultValue={defaultDistance}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-sm text-ink"
        >
          {distances.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {d.km} км
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-soft">
          {t("noteLabel")}
          <span className="ml-1.5 text-xs font-normal text-ink-faint">{t("noteOptional")}</span>
        </label>
        <textarea
          name="contactNote"
          rows={3}
          maxLength={500}
          placeholder={t("notePlaceholder")}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-sm text-ink resize-none"
        />
      </div>

      {state.error === "already_registered" && <p className="text-sm text-danger">{t("errorAlreadyRegistered")}</p>}
      {state.error === "already_on_list" && <p className="text-sm text-danger">{t("errorAlreadyOnList")}</p>}
      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submitCta")}
      </button>
    </form>
  );
}
