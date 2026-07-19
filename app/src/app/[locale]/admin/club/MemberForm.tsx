"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "./actions";
import type { MemberType } from "@/generated/prisma/client";

type Props = {
  mode: "create" | "edit";
  locale: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: {
    name: string;
    role: string;
    bio?: string | null;
    photoUrl?: string | null;
    type: MemberType;
    order: number;
  };
  onDelete?: () => void;
};

export function MemberForm({ mode, action, defaultValues, onDelete }: Props) {
  const t = useTranslations("Admin");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <p className="rounded-[var(--radius-s)] bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("errorInvalid")}
        </p>
      )}
      {state.success && (
        <p className="rounded-[var(--radius-s)] bg-green-50 px-4 py-3 text-sm text-green-700">
          {t("memberSaved")}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink">{t("fieldMemberName")}</label>
        <input
          name="name"
          required
          maxLength={200}
          defaultValue={defaultValues?.name}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ember"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink">{t("fieldMemberRole")}</label>
        <input
          name="role"
          required
          maxLength={200}
          defaultValue={defaultValues?.role}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ember"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink">{t("fieldMemberBio")}</label>
        <textarea
          name="bio"
          maxLength={1000}
          rows={3}
          defaultValue={defaultValues?.bio ?? ""}
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ember"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-ink">{t("fieldMemberPhoto")}</label>
        <input
          name="photoUrl"
          type="url"
          maxLength={500}
          defaultValue={defaultValues?.photoUrl ?? ""}
          placeholder="https://..."
          className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ember"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink">{t("fieldMemberType")}</label>
          <select
            name="type"
            defaultValue={defaultValues?.type ?? "TEAM"}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ember"
          >
            <option value="TEAM">{t("memberTypeTeam")}</option>
            <option value="VOLUNTEER">{t("memberTypeVolunteer")}</option>
          </select>
        </div>

        <div className="flex w-28 flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink">{t("fieldMemberOrder")}</label>
          <input
            name="order"
            type="number"
            min={0}
            max={9999}
            defaultValue={defaultValues?.order ?? 0}
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ember"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="text-sm font-semibold text-red-600 hover:text-red-700"
          >
            {t("deleteCta")}
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-[var(--radius-s)] bg-ember px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
        >
          {mode === "create" ? t("createSubmitCta") : t("saveSubmitCta")}
        </button>
      </div>
    </form>
  );
}
