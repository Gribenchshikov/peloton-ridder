"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { updateProfileAction, type ProfileState } from "./actions";
import { COUNTRIES } from "@/lib/countries";

const initialState: ProfileState = {};

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

const hasCyrillic = (s: string) => /[а-яёА-ЯЁ]/.test(s);

export function ProfileForm({
  user,
  locale,
  callbackUrl,
}: {
  user: { firstName: string; lastName: string; email: string; city: string; country?: string | null; phone: string; tshirtSize?: string | null; birthDate?: Date | null };
  locale: string;
  callbackUrl?: string;
}) {
  const t = useTranslations("Account");
  const tAuth = useTranslations("Auth");
  const boundAction = updateProfileAction.bind(null, locale);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const needsLatinFix = hasCyrillic(user.firstName) || hasCyrillic(user.lastName);

  return (
    <section>
      <h2 className="font-display text-lg font-bold text-ink">{t("profileTitle")}</h2>

      {needsLatinFix && (
        <div className="mt-3 flex items-start gap-3 rounded-[var(--radius-m)] border border-amber-400/40 bg-amber-400/8 px-4 py-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-amber-400" aria-hidden>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-400">Имя должно быть на латинице</p>
            <p className="mt-0.5 text-xs text-ink-soft">
              Имя из Google-аккаунта записано кириллицей. В протоколах забегов используется латиница — пожалуйста, замените имя и фамилию ниже.
            </p>
          </div>
        </div>
      )}

      <form action={formAction} className="mt-3 flex flex-col gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5">
        {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink-soft">{tAuth("email")}</span>
          <input
            value={user.email}
            disabled
            className="rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-2.5 text-ink-faint"
          />
        </label>
        <FormField label={tAuth("name")} name="firstName" type="text" required defaultValue={user.firstName} pattern="[A-Za-z][A-Za-z \-]*" title={tAuth("errorNameLatinOnly")} className={hasCyrillic(user.firstName) ? "border-amber-400 focus:border-amber-400" : undefined} />
        <FormField label={tAuth("surname")} name="lastName" type="text" required defaultValue={user.lastName} pattern="[A-Za-z][A-Za-z \-]*" title={tAuth("errorNameLatinOnly")} className={hasCyrillic(user.lastName) ? "border-amber-400 focus:border-amber-400" : undefined} />
        <FormField label={tAuth("city")} name="city" type="text" defaultValue={user.city} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink-soft">{tAuth("country")}</span>
          <select
            name="country"
            defaultValue={user.country ?? ""}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink"
          >
            <option value="">{t("countryEmpty")}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {locale === "ru" || locale === "kk" ? c.name_ru : c.name_en}
              </option>
            ))}
          </select>
        </label>
        <FormField label={t("phone")} name="phone" type="tel" defaultValue={user.phone} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink-soft">{t("birthDate")}</span>
          <input
            type="date"
            name="birthDate"
            defaultValue={user.birthDate ? user.birthDate.toISOString().slice(0, 10) : ""}
            max={new Date().toISOString().slice(0, 10)}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink-soft">{t("tshirtSize")}</span>
          <select
            name="tshirtSize"
            defaultValue={user.tshirtSize ?? ""}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink"
          >
            <option value="">{t("tshirtSizeEmpty")}</option>
            {TSHIRT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>

        {state.success && <p className="text-sm text-spruce">{t("profileSaved")}</p>}
        {state.error === "name_latin_only" && <p className="text-sm text-danger">{tAuth("errorNameLatinOnly")}</p>}
        {state.error === "invalid" && <p className="text-sm text-danger">{tAuth("errorInvalid")}</p>}

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
        >
          {pending ? tAuth("submitting") : t("saveCta")}
        </button>
      </form>
    </section>
  );
}
