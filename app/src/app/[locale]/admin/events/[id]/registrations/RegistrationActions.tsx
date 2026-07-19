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
  status,
  allowReregistration,
  distances,
}: {
  registrationId: string;
  eventId: string;
  distanceId: string;
  status: "RESERVED" | "PAID" | "CANCELLED";
  allowReregistration: boolean;
  distances: { id: string; name: string; km: number }[];
}) {
  const t = useTranslations("Admin");
  const changeAction = changeRegistrationDistanceAction.bind(null, registrationId, eventId);
  const cancelAction = cancelRegistrationAction.bind(null, registrationId, eventId);
  const [changeState, changeFormAction, changing] = useActionState(changeAction, initialState);
  const [cancelState, cancelFormAction, cancelling] = useActionState(cancelAction, initialState);
  const error = changeState.error ?? cancelState.error;

  if (status === "CANCELLED") {
    return (
      <span className={`text-xs font-medium ${allowReregistration ? "text-success" : "text-ink-faint"}`}>
        {allowReregistration ? t("regReregistrationAllowed") : t("regReregistrationBlocked")}
      </span>
    );
  }

  return (
    <details className="min-w-52 rounded-[var(--radius-s)] border border-border bg-surface p-2">
      <summary className="cursor-pointer list-none text-right text-xs font-semibold text-ember hover:text-ember-strong">
        {t("regManageCta")}
      </summary>
      <div className="mt-3 flex flex-col gap-3 text-left">
        <form action={changeFormAction} className="flex flex-col gap-1.5">
          <label className="text-xs text-ink-faint">{t("regChangeDistanceLabel")}</label>
          <div className="flex gap-1.5">
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
          </div>
        </form>
        <form action={cancelFormAction} className="flex flex-col gap-2 border-t border-border pt-3">
          <label className="text-xs text-ink-faint" htmlFor={`comment-${registrationId}`}>{t("regCancelCommentLabel")}</label>
          <textarea id={`comment-${registrationId}`} name="adminComment" required maxLength={1000} disabled={changing || cancelling} className="min-h-20 resize-y rounded-[var(--radius-s)] border border-border bg-surface px-2 py-1.5 text-xs text-ink" />
          <label className="flex items-start gap-2 text-xs text-ink-soft">
            <input type="checkbox" name="allowReregistration" disabled={changing || cancelling} className="mt-0.5 accent-ember" />
            {t("regAllowReregistration")}
          </label>
          <button type="submit" disabled={changing || cancelling} className="rounded-[var(--radius-s)] border border-danger/30 px-2 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/5 disabled:opacity-60">
            {cancelling ? t("regActionSaving") : t("regCancelCta")}
          </button>
        </form>
      </div>
      {error && <p className="text-xs text-danger">{t(ERROR_KEYS[error])}</p>}
    </details>
  );
}
