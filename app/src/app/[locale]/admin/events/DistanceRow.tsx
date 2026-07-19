"use client";

import { useState, useActionState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { formatKzt } from "@/lib/currency";
import { DistanceForm, type DistanceDefaults } from "./DistanceForm";
import { deleteDistanceAction, uploadTrackAction, type ActionState } from "./actions";
import { AidStationEditor } from "./AidStationEditor";
import type { AidStation } from "@/types/aidStation";

const initialDeleteState: ActionState = {};

export function DistanceRow({
  distance,
}: {
  distance: DistanceDefaults & { id: string; hasProfile?: boolean; gpxUrl?: string | null; aidStations?: AidStation[] | null };
}) {
  const t = useTranslations("Admin");
  const tCommon = useTranslations("Common");
  const format = useFormatter();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showAidStations, setShowAidStations] = useState(false);
  const [gpxState, setGpxState] = useState<{ error?: string; success?: boolean }>({});
  const [isPending, startTransition] = useTransition();

  const boundDelete = deleteDistanceAction.bind(null, distance.id);
  const [deleteState, deleteAction, deletePending] = useActionState(boundDelete, initialDeleteState);

  function handleGpxChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("gpxFile", file);
    setGpxState({});
    startTransition(async () => {
      const result = await uploadTrackAction(distance.id, {}, fd);
      setGpxState(result);
    });
  }

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
          {distance.hasProfile && (
            <span className="ml-2 rounded-full bg-spruce/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-spruce">
              GPX
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* GPX upload button */}
        <label className={`cursor-pointer text-sm font-semibold transition-colors ${isPending ? "text-ink-faint" : "text-ink-soft hover:text-ink"}`}>
          {isPending ? "…" : distance.hasProfile ? t("replaceGpxCta") : t("uploadGpxCta")}
          <input type="file" accept=".gpx,application/gpx+xml,text/xml,application/xml" className="sr-only" onChange={handleGpxChange} disabled={isPending} />
        </label>

        <button
          type="button"
          onClick={() => setShowAidStations((v) => !v)}
          className={`text-sm font-semibold transition-colors ${showAidStations ? "text-ember" : "text-ink-soft hover:text-ink"}`}
        >
          ПП{distance.aidStations?.length ? ` (${distance.aidStations.length})` : ""}
        </button>

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
      {deleteState.error === "hasRegistrations" && (
        <p className="w-full text-sm text-danger">{t("errorHasRegistrations")}</p>
      )}
      {gpxState.success && (
        <p className="w-full text-sm text-spruce">{t("gpxUploaded")}</p>
      )}
      {gpxState.error && (
        <p className="w-full text-sm text-danger">
          {gpxState.error === "invalidGpx" ? t("gpxInvalid") : t("errorInvalid")}
        </p>
      )}
      {showAidStations && (
        <div className="w-full">
          <AidStationEditor
            distanceId={distance.id}
            initialStations={distance.aidStations ?? []}
          />
        </div>
      )}
    </div>
  );
}
