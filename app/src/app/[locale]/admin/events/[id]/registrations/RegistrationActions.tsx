"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  cancelRegistrationAction,
  changeRegistrationDistanceAction,
  type RegistrationAdminActionState,
} from "./actions";

const initialState: RegistrationAdminActionState = {};

const ERROR_KEYS: Record<NonNullable<RegistrationAdminActionState["error"]>, string> = {
  unauthorized: "regActionErrorUnauthorized",
  not_found: "regActionErrorNotFound",
  inactive: "regActionErrorInactive",
  full: "regActionErrorFull",
  has_results: "regActionErrorHasResults",
  invalid: "regActionErrorInvalid",
};

export function RegistrationActions({
  registrationId,
  eventId,
  distanceId,
  distances,
}: {
  registrationId: string;
  eventId: string;
  distanceId: string;
  distances: { id: string; name: string; km: number }[];
}) {
  const t = useTranslations("Admin");
  const changeAction = changeRegistrationDistanceAction.bind(null, registrationId, eventId);
  const cancelAction = cancelRegistrationAction.bind(null, registrationId, eventId);
  const [changeState, changeFormAction, changing] = useActionState(changeAction, initialState);
  const [cancelState, cancelFormAction, cancelling] = useActionState(cancelAction, initialState);
  const error = changeState.error ?? cancelState.error;

  return (
    <div className="flex min-w-48 flex-col items-stretch gap-2">
      <form action={changeFormAction} className="flex gap-1.5">
        <select name="distanceId" defaultValue={distanceId} disabled={changing || cancelling} aria-label={t("regChangeDistanceCta")} className="min-w-0 flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-2 py-1.5 text-xs text-ink">
          {distances.map((distance) => (
            <option key={distance.id} value={distance.id}>
              {distance.name} · {distance.km} км
            </option>
          ))}
        </select>
        <button type="submit" disabled={changing || cancelling} className="rounded-[var(--radius-s)] border border-border px-2 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2 disabled:opacity-60">
          {changing ? t("regActionSaving") : t("regChangeDistanceCta")}
        </button>
      </form>
      <form action={cancelFormAction}>
        <button type="submit" disabled={changing || cancelling} onClick={(event) => { if (!window.confirm(t("regCancelConfirm"))) event.preventDefault(); }} className="w-full rounded-[var(--radius-s)] border border-danger/30 px-2 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/5 disabled:opacity-60">
          {cancelling ? t("regActionSaving") : t("regCancelCta")}
        </button>
      </form>
      {error && <p className="text-xs text-danger">{t(ERROR_KEYS[error])}</p>}
    </div>
  );
}
