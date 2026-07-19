"use client";

import { useState, useActionState } from "react";
import { useTranslations } from "next-intl";
import { MerchForm, type MerchDefaults } from "./MerchForm";
import { deleteMerchAction, type ActionState } from "./actions";

const initialDeleteState: ActionState = {};

export function MerchRow({ item }: { item: MerchDefaults & { id: string } }) {
  const t = useTranslations("Admin");
  const [isEditing, setIsEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const boundDelete = deleteMerchAction.bind(null, item.id);
  const [, deleteAction, deletePending] = useActionState(boundDelete, initialDeleteState);

  if (isEditing) {
    return (
      <div className="rounded-[var(--radius-s)] border border-border bg-surface-2 p-4">
        <MerchForm mode="edit" merchItemId={item.id} defaults={item} onSuccess={() => setIsEditing(false)} />
        <button type="button" onClick={() => setIsEditing(false)} className="mt-2 text-sm text-ink-faint hover:text-ink">
          {t("cancelCta")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-s)] border border-border px-4 py-3">
      <div>
        <span className="font-semibold text-ink">{item.name}</span>
        {item.requiresSize && (
          <span className="ml-2 rounded-full bg-ember/10 px-2 py-0.5 text-xs font-semibold text-ember">
            {t("merchNeedsSize")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {confirmingDelete ? (
          <>
            <span className="text-sm text-danger">{t("deleteConfirmLabel")}</span>
            <form action={deleteAction}>
              <button type="submit" disabled={deletePending} className="text-sm font-semibold text-danger hover:underline">
                {t("deleteConfirmCta")}
              </button>
            </form>
            <button type="button" onClick={() => setConfirmingDelete(false)} className="text-sm text-ink-faint hover:text-ink">
              {t("cancelCta")}
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setIsEditing(true)} className="text-sm font-semibold text-ink hover:text-ember">
              {t("editCta")}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="text-sm font-semibold text-danger hover:underline"
            >
              {t("deleteCta")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
