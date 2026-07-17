"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { updateProfileAction, type ProfileState } from "./actions";

const initialState: ProfileState = {};

export function ProfileForm({ user }: { user: { name: string; email: string; city: string; phone: string } }) {
  const t = useTranslations("Account");
  const tAuth = useTranslations("Auth");
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <section>
      <h2 className="font-display text-lg font-bold text-ink">{t("profileTitle")}</h2>
      <form action={formAction} className="mt-3 flex flex-col gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink-soft">{tAuth("email")}</span>
          <input
            value={user.email}
            disabled
            className="rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-2.5 text-ink-faint"
          />
        </label>
        <FormField label={tAuth("name")} name="name" type="text" required defaultValue={user.name} />
        <FormField label={tAuth("city")} name="city" type="text" defaultValue={user.city} />
        <FormField label={t("phone")} name="phone" type="tel" defaultValue={user.phone} />

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
