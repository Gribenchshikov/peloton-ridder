"use client";

import { useState, useActionState } from "react";
import { requestRefundAction, type RequestRefundState } from "./actions";

type Props = {
  registrationId: string;
  hasTransfer: boolean;
  pendingTypes: string[];
};

const initialState: RequestRefundState = {};

const ERROR_LABELS: Record<string, string> = {
  deadline_passed: "Срок подачи заявки на возврат истёк.",
  already_requested: "Заявка на этот тип возврата уже подана.",
  no_transfer: "У этой регистрации нет трансфера.",
  invalid: "Неверные данные.",
  unauthorized: "Необходима авторизация.",
};

export function RefundRequestButton({ registrationId, hasTransfer, pendingTypes }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"SLOT" | "TRANSFER">("SLOT");
  const [reason, setReason] = useState("");
  const [state, formAction, pending] = useActionState(requestRefundAction, initialState);

  const slotPending = pendingTypes.includes("SLOT");
  const transferPending = pendingTypes.includes("TRANSFER");

  if (state.success) {
    return (
      <span className="text-xs font-semibold text-warn">Заявка на возврат подана</span>
    );
  }

  if (slotPending && (!hasTransfer || transferPending)) {
    return (
      <span className="text-xs font-semibold text-warn">Ожидает возврата</span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-semibold text-danger hover:underline"
      >
        Запросить возврат
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-[var(--radius-l)] border border-border bg-surface p-6 shadow-xl">
            <h2 className="mb-1 font-display text-lg font-bold text-ink">Запросить возврат</h2>
            <p className="mb-5 text-sm text-ink-soft">
              Администратор вернёт деньги вручную через Kaspi после подтверждения.
            </p>

            <form action={formAction} className="flex flex-col gap-4">
              <input type="hidden" name="registrationId" value={registrationId} />
              <input type="hidden" name="refundType" value={type} />

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">Тип возврата</span>
                <label className={`flex cursor-pointer items-center gap-2.5 text-sm ${slotPending ? "opacity-40" : "text-ink"}`}>
                  <input
                    type="radio"
                    checked={type === "SLOT"}
                    onChange={() => setType("SLOT")}
                    disabled={slotPending}
                    className="accent-ember"
                  />
                  Слот (полный возврат регистрации)
                </label>
                {hasTransfer && (
                  <label className={`flex cursor-pointer items-center gap-2.5 text-sm ${transferPending ? "opacity-40" : "text-ink"}`}>
                    <input
                      type="radio"
                      checked={type === "TRANSFER"}
                      onChange={() => setType("TRANSFER")}
                      disabled={transferPending}
                      className="accent-ember"
                    />
                    Трансфер (только трансфер, слот остаётся)
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                  Причина <span className="font-normal normal-case tracking-normal text-ink-faint">(необязательно)</span>
                </label>
                <textarea
                  name="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full resize-y rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
                />
              </div>

              {state.error && (
                <p className="text-sm text-danger">{ERROR_LABELS[state.error] ?? "Ошибка. Попробуйте снова."}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-[var(--radius-s)] bg-danger px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {pending ? "Отправляем…" : "Отправить заявку"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-s)] border border-border px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
