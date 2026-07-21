"use client";

import { useActionState, useState } from "react";
import { submitClubRequestAction, type ClubRequestState } from "./clubRequestAction";

type Club = { id: string; name: string } | null;
type Request = { id: string; clubName: string; status: string; adminNote: string | null } | null;

export function ClubSection({
  currentClub,
  latestRequest,
}: {
  currentClub: Club;
  latestRequest: Request;
}) {
  const [state, formAction, pending] = useActionState<ClubRequestState, FormData>(
    submitClubRequestAction,
    {},
  );
  const [showForm, setShowForm] = useState(false);

  // Если клуб уже привязан — показываем его + кнопку "изменить"
  if (currentClub && !showForm) {
    return (
      <section>
        <h2 className="font-display text-lg font-bold text-ink">Беговой клуб</h2>
        <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-m)] border border-border bg-surface p-4">
          <div className="flex-1">
            <p className="font-semibold text-ink">{currentClub.name}</p>
            <p className="text-xs text-ink-faint">Клуб подтверждён</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="text-sm font-semibold text-ink-soft hover:text-ink"
          >
            Изменить
          </button>
        </div>
      </section>
    );
  }

  // PENDING — на рассмотрении
  if (latestRequest?.status === "PENDING" && !showForm) {
    return (
      <section>
        <h2 className="font-display text-lg font-bold text-ink">Беговой клуб</h2>
        <div className="mt-3 rounded-[var(--radius-m)] border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Заявка на рассмотрении
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            «{latestRequest.clubName}» — ожидайте проверки администратором.
          </p>
        </div>
      </section>
    );
  }

  // Форма подачи заявки (новая или повторная после REJECTED)
  const isRejected = latestRequest?.status === "REJECTED";
  return (
    <section>
      <h2 className="font-display text-lg font-bold text-ink">Беговой клуб</h2>
      {isRejected && !showForm && (
        <div className="mt-3 mb-3 rounded-[var(--radius-s)] border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-red-600">Заявка отклонена</p>
          {latestRequest?.adminNote && (
            <p className="mt-0.5 text-xs text-ink-soft">{latestRequest.adminNote}</p>
          )}
        </div>
      )}
      {state.ok ? (
        <div className="mt-3 rounded-[var(--radius-s)] border border-spruce/30 bg-spruce/5 px-4 py-3 text-sm font-semibold text-spruce">
          ✓ Заявка отправлена — ожидайте проверки администратором.
        </div>
      ) : (
        <form action={formAction} className="mt-3 flex gap-2">
          <input
            name="clubName"
            type="text"
            placeholder="Название вашего клуба"
            maxLength={100}
            required
            className="flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
          >
            {pending ? "…" : "Подать заявку"}
          </button>
        </form>
      )}
      {state.error === "too_short" && (
        <p className="mt-1 text-xs text-danger">Название слишком короткое.</p>
      )}
      {state.error === "already_pending" && (
        <p className="mt-1 text-xs text-danger">У вас уже есть активная заявка.</p>
      )}
      {state.error && !["too_short", "already_pending"].includes(state.error) && (
        <p className="mt-1 text-xs text-danger">Ошибка. Попробуйте снова.</p>
      )}
    </section>
  );
}
