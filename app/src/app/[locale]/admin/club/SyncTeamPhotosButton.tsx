"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { syncTeamPhotosAction, type SyncTeamPhotosState } from "./actions";

const initial: SyncTeamPhotosState = {};

export function SyncTeamPhotosButton() {
  const t = useTranslations("Admin");
  const [state, action, pending] = useActionState(syncTeamPhotosAction, initial);

  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-bold text-ink transition-colors hover:border-ember hover:text-ember disabled:opacity-60"
      >
        {pending ? t("syncTeamPhotosPending") : t("syncTeamPhotosCta")}
      </button>
      {state.success && (
        <p className="text-xs text-spruce">{t("syncTeamPhotosDone", { count: state.uploaded ?? 0 })}</p>
      )}
      {state.error && <p className="text-xs text-ember-strong">{state.error}</p>}
    </form>
  );
}
