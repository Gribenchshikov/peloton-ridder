"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createClubAction, updateClubAction, type ActionState } from "./actions";

type Props = {
  mode: "create" | "edit";
  locale: string;
  clubId?: string;
  defaults?: { name: string; city: string | null };
};

const initial: ActionState = {};

export function ClubForm({ mode, locale, clubId, defaults }: Props) {
  const t = useTranslations("Admin");
  const action = mode === "edit" && clubId
    ? updateClubAction.bind(null, clubId)
    : createClubAction.bind(null, locale);
  const [state, dispatch] = useActionState(action, initial);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-soft">{t("fieldClubName")}</label>
        <input
          name="name"
          type="text"
          required
          defaultValue={defaults?.name}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-soft">
          {t("fieldClubCity")}
          <span className="ml-1.5 text-xs font-normal text-ink-faint">{t("optional")}</span>
        </label>
        <input
          name="city"
          type="text"
          defaultValue={defaults?.city ?? undefined}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
        />
      </div>

      {state.success && <p className="text-sm text-spruce">{t("clubSaved")}</p>}
      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}

      <button
        type="submit"
        className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
      >
        {mode === "create" ? t("createClubCta") : t("saveCta")}
      </button>
    </form>
  );
}
