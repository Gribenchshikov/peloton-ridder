"use client";

import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import { createSeriesAction, updateSeriesAction, type ActionState } from "./actions";

type Race = { id: string; name: string };
type SeriesRaceEntry = { raceId: string; stageOrder: number };

type Props = {
  mode: "create" | "edit";
  locale: string;
  seriesId?: string;
  allRaces: Race[];
  defaults?: {
    name: string;
    description: string | null;
    seriesRaces: SeriesRaceEntry[];
  };
};

const initialState: ActionState = {};

export function SeriesForm({ mode, locale, seriesId, allRaces, defaults }: Props) {
  const t = useTranslations("Admin");
  const formRef = useRef<HTMLFormElement>(null);

  const action = mode === "edit" && seriesId
    ? updateSeriesAction.bind(null, seriesId)
    : createSeriesAction.bind(null, locale);

  const [state, dispatch] = useActionState(action, initialState);

  const existingRaceIds = new Set(defaults?.seriesRaces.map((sr) => sr.raceId) ?? []);
  const existingOrder = Object.fromEntries(
    defaults?.seriesRaces.map((sr) => [sr.raceId, sr.stageOrder]) ?? [],
  );

  return (
    <form ref={formRef} action={dispatch} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink-soft">{t("fieldSeriesName")}</label>
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
          {t("fieldSeriesDescription")}
          <span className="ml-1.5 text-xs font-normal text-ink-faint">{t("optional")}</span>
        </label>
        <textarea
          name="description"
          rows={3}
          defaultValue={defaults?.description ?? undefined}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-ink-soft">{t("fieldSeriesRaces")}</p>
        <div className="flex flex-col gap-3">
          {allRaces.map((race, idx) => {
            const checked = existingRaceIds.has(race.id);
            const order = existingOrder[race.id] ?? idx + 1;
            return (
              <label key={race.id} className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name={`race_${race.id}`}
                  defaultChecked={checked}
                  className="h-4 w-4 cursor-pointer accent-ember"
                />
                <span className="flex-1 font-medium text-ink">{race.name}</span>
                <span className="text-xs text-ink-faint">{t("fieldSeriesOrder")}</span>
                <input
                  type="number"
                  name={`order_${race.id}`}
                  defaultValue={order}
                  min={1}
                  max={99}
                  className="w-14 rounded-[var(--radius-s)] border border-border bg-surface px-2 py-1 text-sm text-ink focus:border-ember focus:outline-none"
                />
              </label>
            );
          })}
        </div>
      </div>

      {state.success && <p className="text-sm text-spruce">{t("seriesSaved")}</p>}
      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}

      <button
        type="submit"
        className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
      >
        {mode === "create" ? t("createSeriesCta") : t("saveCta")}
      </button>
    </form>
  );
}
