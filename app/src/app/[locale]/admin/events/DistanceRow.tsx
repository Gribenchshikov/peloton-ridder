"use client";

import { useState, useActionState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { formatKzt } from "@/lib/currency";
import { DistanceForm, type DistanceDefaults } from "./DistanceForm";
import { deleteDistanceAction, type ActionState } from "./actions";

const initialDeleteState: ActionState = {};

export function DistanceRow({ distance }: { distance: DistanceDefaults & { id: string } }) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const format = useFormatter();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const boundDelete = deleteDistanceAction.bind(null, distance.id);
  const [deleteState, deleteAction, deletePending] = useActionState(boundDelete, initialDeleteState);

  if (isEditing) {
    return (
      <div className="rounded-[var(--radius-s)] border border-border bg-surface-2 p-4">
        <DistanceForm mode="edit" distanceId={distance.id} defaults={distance} onSuccess={() => setIsEditing(false)} />
        <button type="button" onClick={() => setIsEditing(false)} className="mt-2 text-sm text-ink-faint hover:text-ink">
          {t("cancelCta")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-s)] border border-border px-4 py-3">
      <div>
        <div className="font-semibold text-ink">
          {distance.discipline ? `${distance.discipline} — ` : ""}
          {distance.name} ({format.number(distance.km)} {tCommon("km")})
        </div>
        <div className="text-sm text-ink-faint">
          {formatKzt(format, distance.price)}
          {" · "}
          {t("bibRangeLabel", { start: distance.bibRangeStart, end: distance.bibRangeEnd })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {confirmingDelete ? (
          <>
            <span className="text-sm text-danger">{t("deleteConfirmLabel")}</span>
            <form action={deleteAction}>
              <button type="submit" disabled={deletePending} className="text-sm font-semibold text-danger hover:underline">
                {t("deleteConfirmCta")}
              </button>
            </form>
            <button type="button" onClick={() => setConfirmingDelete(false)} className="text-sm text-ink-faint hover:text-ink">
              {t("cancelCta")}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setIsEditing(true)} className="text-sm font-semibold text-ink hover:text-ember">
              {t("editCta")}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-sm font-semibold text-danger hover:underline"
            >
              {t("deleteCta")}
            </button>
          </>
        )}
      </div>
      {deleteState.error === "hasRegistrations" && <p className="w-full text-sm text-danger">{t("errorHasRegistrations")}</p>}
    </div>
  );
}
