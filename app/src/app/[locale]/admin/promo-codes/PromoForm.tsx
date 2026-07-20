"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createPromoAction, updatePromoAction, type ActionState } from "./actions";

type Event = { id: string; race: { name: string }; year: number };

type Defaults = {
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxUses: number | null;
  expiresAt: Date | null;
  eventId: string | null;
  active: boolean;
};

type Props = {
  mode: "create" | "edit";
  locale: string;
  promoId?: string;
  events: Event[];
  defaults?: Defaults;
};

const initial: ActionState = {};

function toDateInput(d: Date | null) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function PromoForm({ mode, locale, promoId, events, defaults }: Props) {
  const t = useTranslations("Admin");
  const action = mode === "edit" && promoId
    ? updatePromoAction.bind(null, promoId)
    : createPromoAction.bind(null, locale);
  const [state, dispatch] = useActionState(action, initial);

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-soft">{t("fieldPromoCode")}</label>
          <input
            name="code"
            type="text"
            required
            defaultValue={defaults?.code}
            placeholder="RIDDER2026"
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 font-mono text-sm uppercase text-ink focus:border-ember focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-soft">{t("fieldPromoEvent")}</label>
          <select
            name="eventId"
            defaultValue={defaults?.eventId ?? ""}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          >
            <option value="">{t("promoEventAll")}</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.race.name} {e.year}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-soft">{t("fieldPromoDiscountType")}</label>
          <select
            name="discountType"
            defaultValue={defaults?.discountType ?? "PERCENT"}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          >
            <option value="PERCENT">{t("promoTypePercent")}</option>
            <option value="FIXED">{t("promoTypeFixed")}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-soft">{t("fieldPromoDiscountValue")}</label>
          <input
            name="discountValue"
            type="number"
            required
            min={1}
            defaultValue={defaults?.discountValue}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-soft">
            {t("fieldPromoMaxUses")}
            <span className="ml-1.5 text-xs font-normal text-ink-faint">{t("optional")}</span>
          </label>
          <input
            name="maxUses"
            type="number"
            min={1}
            defaultValue={defaults?.maxUses ?? undefined}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink-soft">
            {t("fieldPromoExpiresAt")}
            <span className="ml-1.5 text-xs font-normal text-ink-faint">{t("optional")}</span>
          </label>
          <input
            name="expiresAt"
            type="date"
            defaultValue={toDateInput(defaults?.expiresAt ?? null)}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={defaults?.active ?? true}
          className="h-4 w-4 cursor-pointer accent-ember"
        />
        <span className="font-semibold text-ink-soft">{t("fieldPromoActive")}</span>
      </label>

      {state.success && <p className="text-sm text-spruce">{t("promoSaved")}</p>}
      {state.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}
      {state.error === "duplicate" && <p className="text-sm text-danger">{t("promoErrorDuplicate")}</p>}

      <button
        type="submit"
        className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
      >
        {mode === "create" ? t("createPromoCta") : t("saveCta")}
      </button>
    </form>
  );
}
