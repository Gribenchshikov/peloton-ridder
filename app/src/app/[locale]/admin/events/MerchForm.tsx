"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/FormField";
import { createMerchAction, updateMerchAction, type ActionState } from "./actions";
import { submitRegisteredForm, useEventSaveRegistration } from "./[id]/EventSaveBar";

const initialState: ActionState = {};

export type MerchDefaults = {
  name: string;
  requiresSize: boolean;
  order: number;
};

type MerchFormProps =
  | { mode: "create"; eventId: string; onSuccess?: () => void }
  | { mode: "edit"; merchItemId: string; defaults: MerchDefaults; onSuccess?: () => void };

export function MerchForm(props: MerchFormProps) {
  const t = useTranslations("Admin");
  const tAuth = useTranslations("Auth");

  const d = props.mode === "edit" ? props.defaults : undefined;

  const boundAction =
    props.mode === "create"
      ? createMerchAction.bind(null, props.eventId)
      : updateMerchAction.bind(null, props.merchItemId);
  async function action(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const result = await boundAction(prevState, formData);
    if (result.success) props.onSuccess?.();
    return result;
  }
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [bulkState, setBulkState] = useState<ActionState>({});
  const displayState = bulkState.error || bulkState.success ? bulkState : state;
  const { hideInlineSave } = useEventSaveRegistration(
    props.mode === "edit" ? `merch-${props.merchItemId}` : "",
    async () => {
      if (props.mode !== "edit") return { success: true };
      const result = await submitRegisteredForm(formRef.current, boundAction);
      setBulkState(result);
      if (result.success) props.onSuccess?.();
      return result;
    },
  );

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <FormField label={t("fieldMerchName")} name="name" type="text" required defaultValue={d?.name} />
      <FormField
        label={t("fieldMerchOrder")}
        name="order"
        type="number"
        optional
        defaultValue={d ? String(d.order) : "0"}
        hint={t("fieldMerchOrderHint")}
      />

      <div className="sm:col-span-2">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="requiresSize"
            defaultChecked={d?.requiresSize}
            className="h-4 w-4 rounded border-border accent-ember"
          />
          <span className="text-sm font-semibold text-ink">{t("fieldMerchRequiresSize")}</span>
        </label>
        <p className="mt-1 text-xs text-ink-faint">{t("fieldMerchRequiresSizeHint")}</p>
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        {displayState.error === "invalid" && <p className="text-sm text-danger">{t("errorInvalid")}</p>}
        {(!hideInlineSave || props.mode === "create") && (
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
        >
          {pending ? tAuth("submitting") : props.mode === "create" ? t("addMerchCta") : t("saveSubmitCta")}
        </button>
        )}
      </div>
    </form>
  );
}
