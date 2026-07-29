"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef } from "react";
import type { RaceFormState } from "./actions";

type Props =
  | { mode: "create"; action: (prev: RaceFormState, fd: FormData) => Promise<RaceFormState> }
  | {
      mode: "edit";
      action: (prev: RaceFormState, fd: FormData) => Promise<RaceFormState>;
      defaults: { name: string; slug: string; courseIntro: string; icon: string; color: string; isChallenge: boolean };
    };

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function RaceForm(props: Props) {
  const t = useTranslations("Admin");
  const [state, dispatch, pending] = useActionState(props.action, {});
  const slugRef = useRef<HTMLInputElement>(null);
  const defaults = props.mode === "edit" ? props.defaults : null;

  function onNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (props.mode === "create" && slugRef.current && !slugRef.current.dataset.edited) {
      slugRef.current.value = slugify(e.target.value);
    }
  }

  const errorMap: Record<string, string> = {
    duplicate_slug: t("raceErrorDuplicateSlug"),
    unauthorized: t("raceErrorUnauthorized"),
  };

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {state.saved && (
        <p className="rounded-[var(--radius-s)] bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {t("eventSaved")}
        </p>
      )}
      {state.error && (
        <p className="rounded-[var(--radius-s)] bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errorMap[state.error] ?? state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink">{t("fieldName")} *</label>
        <input
          name="name"
          required
          defaultValue={defaults?.name}
          onChange={onNameChange}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ember focus:ring-1 focus:ring-ember"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-500">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink">Slug (URL) *</label>
        <input
          name="slug"
          required
          ref={slugRef}
          defaultValue={defaults?.slug}
          onInput={() => { if (slugRef.current) slugRef.current.dataset.edited = "1"; }}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 font-mono text-sm text-ink outline-none focus:border-ember focus:ring-1 focus:ring-ember"
        />
        <p className="text-xs text-ink-faint">Только строчные латинские буквы, цифры и дефис. Используется в URL событий.</p>
        {state.fieldErrors?.slug && (
          <p className="text-xs text-red-500">{state.fieldErrors.slug[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink">{t("raceFieldIcon")}</label>
          <select
            name="icon"
            defaultValue={defaults?.icon ?? "i-mountain"}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ember focus:ring-1 focus:ring-ember"
          >
            {["i-mountain", "i-drop", "i-leaf", "i-ski", "i-route", "i-pin", "i-clock", "i-arrow", "i-user", "i-check"].map((name) => (
              <option key={name} value={name}>{name.replace("i-", "")}</option>
            ))}
          </select>
          <p className="text-xs text-ink-faint">Иконка отображается на карточке забега</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink">{t("raceFieldColor")}</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              name="color"
              defaultValue={defaults?.color ?? "#e87040"}
              className="h-9 w-12 cursor-pointer rounded-[var(--radius-s)] border border-border bg-surface p-0.5"
            />
            <span className="text-xs text-ink-faint">Фон карточки трассы</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink">{t("raceFieldIntro")}</label>
        <textarea
          name="courseIntro"
          defaultValue={defaults?.courseIntro ?? ""}
          rows={4}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ember focus:ring-1 focus:ring-ember"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="isChallenge"
          defaultChecked={defaults?.isChallenge ?? false}
          className="h-4 w-4 cursor-pointer accent-ember"
        />
        <span className="font-semibold text-ink-soft">Онлайн-челлендж (результаты из Strava)</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
      >
        {pending ? "…" : props.mode === "create" ? t("createSubmitCta") : t("saveSubmitCta")}
      </button>
    </form>
  );
}
