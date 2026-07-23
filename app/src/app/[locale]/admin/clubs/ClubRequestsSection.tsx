"use client";

import { useState, useTransition } from "react";
import { approveClubRequestAction, rejectClubRequestAction } from "./clubApprovalActions";

type PendingRequest = {
  id: string;
  clubName: string;
  createdAt: Date;
  user: { firstName: string; lastName: string; email: string };
};

export function ClubRequestsSection({ requests }: { requests: PendingRequest[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [clubName, setClubName] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (requests.length === 0) return null;

  function openAction(id: string, m: "approve" | "reject", req: PendingRequest) {
    setActiveId(id);
    setMode(m);
    setError(null);
    setClubName(req.clubName);
    setRejectNote("");
  }

  function reset() {
    setActiveId(null);
    setMode(null);
    setError(null);
  }

  async function handleSubmit(req: PendingRequest) {
    setError(null);
    startTransition(async () => {
      const res =
        mode === "approve"
          ? await approveClubRequestAction(req.id, clubName)
          : await rejectClubRequestAction(req.id, rejectNote);
      if (res.error) {
        setError("Не удалось выполнить действие.");
      } else {
        reset();
      }
    });
  }

  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-lg font-bold text-ink">
        Заявки на новый клуб
        <span className="ml-2 rounded-full bg-ember/10 px-2 py-0.5 text-xs font-bold text-ember">
          {requests.length}
        </span>
      </h2>
      <div className="flex flex-col gap-3">
        {requests.map((req) => {
          const isActive = activeId === req.id;
          return (
            <div
              key={req.id}
              className="rounded-[var(--radius-m)] border border-border bg-surface p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">«{req.clubName}»</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {req.user.firstName} {req.user.lastName} · {req.user.email}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-faint">
                    {new Date(req.createdAt).toLocaleDateString("ru-RU")}
                  </p>
                </div>
                {!isActive && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openAction(req.id, "approve", req)}
                      disabled={pending}
                      className="rounded-[var(--radius-s)] bg-spruce px-3 py-1.5 text-xs font-bold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                    >
                      Одобрить
                    </button>
                    <button
                      type="button"
                      onClick={() => openAction(req.id, "reject", req)}
                      disabled={pending}
                      className="rounded-[var(--radius-s)] border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/20"
                    >
                      Отклонить
                    </button>
                  </div>
                )}
              </div>

              {isActive && (
                <div className="mt-4 border-t border-border pt-4">
                  {mode === "approve" && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-ink-soft">
                        Будет создан новый клуб. Можно скорректировать название:
                      </p>
                      <input
                        type="text"
                        value={clubName}
                        onChange={(e) => setClubName(e.target.value)}
                        className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink"
                      />
                    </div>
                  )}

                  {mode === "reject" && (
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-ink-soft">Причина отклонения (необязательно):</p>
                      <input
                        type="text"
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Комментарий для пользователя"
                        className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink"
                      />
                    </div>
                  )}

                  {error && <p className="mt-2 text-xs text-danger">{error}</p>}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={reset}
                      className="rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface-2"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmit(req)}
                      disabled={pending || (mode === "approve" && !clubName.trim())}
                      className={`rounded-[var(--radius-s)] px-3 py-1.5 text-xs font-bold text-white transition-colors disabled:opacity-50 ${
                        mode === "reject" ? "bg-red-500 hover:bg-red-600" : "bg-spruce hover:opacity-90"
                      }`}
                    >
                      {pending ? "…" : mode === "reject" ? "Отклонить" : "Одобрить и создать клуб"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
