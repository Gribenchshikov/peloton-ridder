"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { updateProfileAction, type ProfileState } from "./actions";

const initialState: ProfileState = {};

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export function ProfileForm({
  user,
  locale,
  callbackUrl,
}: {
  user: { firstName: string; lastName: string; email: string; city: string; phone: string; tshirtSize?: string | null };
  locale: string;
  callbackUrl?: string;
}) {
  const t = useTranslations("Account");
  const tAuth = useTranslations("Auth");
  const boundAction = updateProfileAction.bind(null, locale);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <section>
      <h2 className="font-display text-lg font-bold text-ink">{t("profileTitle")}</h2>
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
        <FormField label={tAuth("name")} name="firstName" type="text" required defaultValue={user.firstName} />
        <FormField label={tAuth("surname")} name="lastName" type="text" required defaultValue={user.lastName} />
        <FormField label={tAuth("city")} name="city" type="text" defaultValue={user.city} />
        <FormField label={t("phone")} name="phone" type="tel" defaultValue={user.phone} />
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
