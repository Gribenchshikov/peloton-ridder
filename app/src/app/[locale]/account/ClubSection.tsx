"use client";

import { useActionState, useState, useTransition } from "react";
import { submitClubRequestAction, joinClubAction, type ClubRequestState } from "./clubRequestAction";

type Club = { id: string; name: string };
type CurrentClub = { id: string; name: string } | null;
type Request = { id: string; clubName: string; status: string; adminNote: string | null } | null;

export function ClubSection({
  currentClub,
  latestRequest,
  clubs,
}: {
  currentClub: CurrentClub;
  latestRequest: Request;
  clubs: Club[];
}) {
  const [state, formAction, pending] = useActionState<ClubRequestState, FormData>(
    submitClubRequestAction,
    {},
  );
  const [showChange, setShowChange] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState(clubs[0]?.id ?? "");
  const [joinPending, startJoin] = useTransition();
  const [joinError, setJoinError] = useState<string | null>(null);

  function handleJoin() {
    if (!selectedClubId) return;
    setJoinError(null);
    startJoin(async () => {
      const res = await joinClubAction(selectedClubId);
      if (res.error) setJoinError("Не удалось вступить в клуб. Попробуйте снова.");
    });
  }

  // Уже в клубе — показываем название
  if (currentClub && !showChange) {
    return (
      <div className="flex items-center gap-3 rounded-[var(--radius-m)] border border-border bg-surface p-4">
        <div className="flex-1">
          <p className="font-semibold text-ink">{currentClub.name}</p>
          <p className="text-xs text-ink-faint">Клуб подтверждён</p>
        </div>
        <button
          type="button"
          onClick={() => { setShowChange(true); setShowNewForm(false); }}
          className="text-sm font-semibold text-ink-soft hover:text-ink"
        >
          Изменить
        </button>
      </div>
    );
  }

  // Заявка на рассмотрении
  if (latestRequest?.status === "PENDING" && !showChange) {
    return (
      <div className="rounded-[var(--radius-m)] border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          Заявка на рассмотрении
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          «{latestRequest.clubName}» — ожидайте проверки администратором.
        </p>
      </div>
    );
  }

  const isRejected = latestRequest?.status === "REJECTED";

  return (
    <div className="flex flex-col gap-3">
      {isRejected && !showChange && (
        <div className="rounded-[var(--radius-s)] border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-red-600">Заявка отклонена</p>
          {latestRequest?.adminNote && (
            <p className="mt-0.5 text-xs text-ink-soft">{latestRequest.adminNote}</p>
          )}
        </div>
      )}

      {/* Выбор из существующих клубов */}
      {clubs.length > 0 && !showNewForm && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-soft">Выберите клуб из списка:</p>
          <div className="flex gap-2">
            <select
              value={selectedClubId}
              onChange={(e) => setSelectedClubId(e.target.value)}
              className="flex-1 rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
            >
              {clubs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleJoin}
              disabled={joinPending || !selectedClubId}
              className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-50"
            >
              {joinPending ? "…" : "Вступить"}
            </button>
          </div>
          {joinError && <p className="text-xs text-danger">{joinError}</p>}
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="self-start text-xs font-semibold text-ink-faint hover:text-ink"
          >
            Нет моего клуба в списке? Предложить новый →
          </button>
        </div>
      )}

      {/* Форма предложения нового клуба */}
      {(clubs.length === 0 || showNewForm) && (
        <div className="flex flex-col gap-2">
          {showNewForm && clubs.length > 0 && (
            <button
              type="button"
              onClick={() => setShowNewForm(false)}
              className="self-start text-xs font-semibold text-ink-faint hover:text-ink"
            >
              ← Выбрать из списка
            </button>
          )}
          {state.ok ? (
            <div className="rounded-[var(--radius-s)] border border-spruce/30 bg-spruce/5 px-4 py-3 text-sm font-semibold text-spruce">
              ✓ Заявка отправлена — ожидайте проверки администратором.
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-soft">Предложить новый клуб:</p>
              <form action={formAction} className="flex gap-2">
                <input
                  name="clubName"
                  type="text"
                  placeholder="Название клуба"
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
            </>
          )}
          {state.error === "too_short" && <p className="text-xs text-danger">Название слишком короткое.</p>}
          {state.error === "already_pending" && <p className="text-xs text-danger">У вас уже есть активная заявка.</p>}
          {state.error && !["too_short", "already_pending"].includes(state.error) && (
            <p className="text-xs text-danger">Ошибка. Попробуйте снова.</p>
          )}
        </div>
      )}
    </div>
  );
}
