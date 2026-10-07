"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import type { ActionState } from "./actions";
import { publicAssetUrl } from "@/lib/publicAssetUrl";

type Props = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  defaultValues?: { name?: string; logoUrl?: string; websiteUrl?: string };
  submitLabel: string;
  extra?: React.ReactNode;
};

export function PartnerForm({ action, defaultValues = {}, submitLabel, extra }: Props) {
  const t = useTranslations("Admin");
  const [state, formAction, pending] = useActionState(action, {});
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(publicAssetUrl(defaultValues.logoUrl) ?? null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error === "invalid" && (
        <p className="rounded-[var(--radius-s)] bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {t("errorInvalid")}
        </p>
      )}
      {state.error === "logoRequired" && (
        <p className="rounded-[var(--radius-s)] bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {t("partnerLogoRequired")}
        </p>
      )}
      {(state.error === "invalidType" || state.error === "tooLarge") && (
        <p className="rounded-[var(--radius-s)] bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {state.error === "tooLarge" ? t("partnerLogoTooLarge") : t("partnerLogoInvalidType")}
        </p>
      )}
      {state.success && (
        <p className="rounded-[var(--radius-s)] bg-green-50 px-4 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          {t("partnerSaved")}
        </p>
      )}

      <FormField label={t("partnerFieldName")} name="name" type="text" defaultValue={defaultValues.name} required />

      {/* Logo upload */}
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-ink-soft">{t("partnerFieldLogo")}</span>
        {preview && (
          <div className="flex h-16 w-40 items-center justify-center rounded-[var(--radius-s)] border border-border bg-surface p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={publicAssetUrl(preview) ?? preview} alt="логотип" className="max-h-full max-w-full object-contain" />
          </div>
        )}
        <input
          ref={fileRef}
          name="logoFile"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink file:mr-3 file:rounded file:border-0 file:bg-ember/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-ember"
        />
        {defaultValues.logoUrl && (
          <input type="hidden" name="currentLogoUrl" value={defaultValues.logoUrl} />
        )}
        <span className="text-xs text-ink-faint">JPEG, PNG, WebP или SVG · макс. 5 МБ · рекомендуем 240×80 px, прозрачный фон</span>
      </div>

      <FormField label={t("partnerFieldWebsiteUrl")} name="websiteUrl" type="url" defaultValue={defaultValues.websiteUrl} />

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
        >
          {pending ? "…" : submitLabel}
        </button>
        {extra}
      </div>
    </form>
  );
}
