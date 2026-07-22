"use client";

import { useState, useTransition } from "react";
import {
  reviewVolunteerAction,
  revokeVolunteerAction,
  toggleVolunteerCreditAction,
  resetVolunteerProgressAction,
  sendVolunteerRewardEmailAction,
  sendVolunteerBroadcastAction,
} from "./actions";

type Application = {
  id: string;
  status: string;
  motivation: string;
  experience: string;
  stravaUrl: string | null;
  availability: string;
  createdAt: Date;
  creditedAt: Date | null;
  user: { id: string; firstName: string; lastName: string; email: string; phone: string | null };
  event: {
    id: string;
    year: number;
    dateISO: Date;
    volunteerChatUrl: string | null;
    race: { name: string };
  };
};

type Tab = "applications" | "volunteers";

export function VolunteersView({ applications }: { applications: Application[] }) {
  const [tab, setTab] = useState<Tab>("applications");
  const [searchQuery, setSearchQuery] = useState("");

  const q = searchQuery.trim().toLowerCase();

  const matchesQuery = (app: Application) =>
    !q ||
    `${app.user.firstName} ${app.user.lastName}`.toLowerCase().includes(q) ||
    app.user.email.toLowerCase().includes(q);

  const pending = applications.filter((a) => a.status === "PENDING" && matchesQuery(a));
  const approved = applications.filter((a) => a.status === "APPROVED" && matchesQuery(a));
  const rejected = applications.filter((a) => a.status === "REJECTED" && matchesQuery(a));
  const reviewed = [...approved, ...rejected].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const allPending = applications.filter((a) => a.status === "PENDING");

  // Group approved by user for volunteers tab
  const byUser = new Map<
    string,
    { user: Application["user"]; apps: Application[] }
  >();
  for (const app of approved) {
    if (!byUser.has(app.user.id)) {
      byUser.set(app.user.id, { user: app.user, apps: [] });
    }
    byUser.get(app.user.id)!.apps.push(app);
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 border-b border-border">
        <TabButton active={tab === "applications"} onClick={() => setTab("applications")} badge={allPending.length}>
          Заявки
        </TabButton>
        <TabButton active={tab === "volunteers"} onClick={() => setTab("volunteers")} badge={0}>
          Волонтёры ({applications.filter((a) => a.status === "APPROVED").length})
        </TabButton>
      </div>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Поиск по имени, фамилии или email…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-sm rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
        />
      </div>

      {tab === "applications" && (
        <ApplicationsTab pending={pending} reviewed={reviewed} />
      )}
      {tab === "volunteers" && (
        <VolunteersTab byUser={byUser} />
      )}
    </div>
  );
}

// ─── Tab: Заявки ─────────────────────────────────────────────────────────────

function ApplicationsTab({ pending, reviewed }: { pending: Application[]; reviewed: Application[] }) {
  if (pending.length === 0 && reviewed.length === 0) {
    return <p className="text-sm text-ink-faint">Заявок пока нет.</p>;
  }
  return (
    <div className="flex flex-col gap-8">
      {pending.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-faint">
            На рассмотрении · {pending.length}
          </h2>
          <div className="flex flex-col gap-3">
            {pending.map((app) => <PendingCard key={app.id} app={app} />)}
          </div>
        </section>
      )}
      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-faint">
            Рассмотренные · {reviewed.length}
          </h2>
          <div className="flex flex-col gap-2">
            {reviewed.map((app) => <ReviewedRow key={app.id} app={app} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function PendingCard({ app }: { app: Application }) {
  const [expanded, setExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | null>(null);

  if (decision) {
    return (
      <div className="flex items-center justify-between rounded-[var(--radius-m)] border border-border bg-surface px-4 py-3">
        <span className="text-sm font-medium text-ink">
          {app.user.firstName} {app.user.lastName} · {app.event.race.name} {app.event.year}
        </span>
        <span className={`text-xs font-bold uppercase tracking-wide ${decision === "APPROVED" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
          {decision === "APPROVED" ? "Одобрено ✓" : "Отклонено ✗"}
        </span>
      </div>
    );
  }

  function handle(d: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      await reviewVolunteerAction(app.id, d);
      setDecision(d);
    });
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-border bg-surface">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <span className="font-semibold text-ink">{app.user.firstName} {app.user.lastName}</span>
          <span className="ml-2 text-sm text-ink-soft">{app.event.race.name} {app.event.year}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-faint">
            {new Date(app.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
          </span>
          <span className="text-ink-faint">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <p className="mb-3 text-xs text-ink-faint">
            {app.user.email}{app.user.phone ? ` · ${app.user.phone}` : ""}
          </p>
          <div className="flex flex-col gap-3 text-sm">
            <Field label="Мотивация" value={app.motivation} />
            <Field label="Опыт" value={app.experience} />
            <Field label="Доступность" value={app.availability} />
            {app.stravaUrl && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Strava</span>
                <a href={app.stravaUrl} target="_blank" rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-ember hover:underline">{app.stravaUrl}</a>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <button type="button" disabled={isPending} onClick={() => handle("APPROVED")}
              className="rounded-[var(--radius-s)] bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
              {isPending ? "…" : "Одобрить"}
            </button>
            <button type="button" disabled={isPending} onClick={() => handle("REJECTED")}
              className="rounded-[var(--radius-s)] border border-border bg-transparent px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2 disabled:opacity-50">
              {isPending ? "…" : "Отклонить"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewedRow({ app }: { app: Application }) {
  const isApproved = app.status === "APPROVED";
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-s)] border border-border px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-ink">{app.user.firstName} {app.user.lastName}</span>
        <span className="text-xs text-ink-faint">{app.event.race.name} {app.event.year}</span>
      </div>
      <span className={`text-xs font-bold uppercase tracking-wide ${isApproved ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
        {isApproved ? "Одобрено" : "Отклонено"}
      </span>
    </div>
  );
}

// ─── Tab: Волонтёры ──────────────────────────────────────────────────────────

function VolunteersTab({
  byUser,
}: {
  byUser: Map<string, { user: Application["user"]; apps: Application[] }>;
}) {
  const [showBroadcast, setShowBroadcast] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* Broadcast button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowBroadcast(true)}
          className="rounded-[var(--radius-s)] bg-[#229ED9] px-4 py-2 text-sm font-bold text-white hover:bg-[#1a8bbf]"
        >
          📣 Рассылка в Telegram
        </button>
      </div>

      {byUser.size === 0 ? (
        <p className="text-sm text-ink-faint">Одобренных волонтёров пока нет.</p>
      ) : (
        [...byUser.entries()].map(([userId, { user, apps }]) => (
          <VolunteerRow key={userId} user={user} apps={apps} />
        ))
      )}

      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} />}
    </div>
  );
}

function VolunteerRow({
  user,
  apps,
}: {
  user: Application["user"];
  apps: Application[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [resetDone, setResetDone] = useState(false);

  const creditedCount = apps.filter((a) => a.creditedAt).length;
  const total = apps.length;

  function handleReset() {
    if (!confirm(`Сбросить прогресс волонтёра ${user.firstName} ${user.lastName}? Это снимет все зачёты.`)) return;
    startTransition(async () => {
      await resetVolunteerProgressAction(user.id);
      setResetDone(true);
      setTimeout(() => setResetDone(false), 2000);
    });
  }

  return (
    <div className="rounded-[var(--radius-m)] border border-border bg-surface">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-4 text-left"
        >
          <div className="flex-1">
            <span className="font-semibold text-ink">{user.firstName} {user.lastName}</span>
            <span className="ml-2 text-xs text-ink-faint">{user.email}</span>
            {user.phone && <span className="ml-2 text-xs text-ink-faint">{user.phone}</span>}
          </div>
          {/* Progress pill */}
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
            creditedCount >= total && total > 0
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              : "bg-surface-2 text-ink-soft"
          }`}>
            {creditedCount} / {total}
          </span>
          <span className="text-ink-faint">{expanded ? "▲" : "▼"}</span>
        </button>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="rounded-[var(--radius-s)] border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            ✉ Письмо
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={handleReset}
            className="rounded-[var(--radius-s)] border border-border bg-transparent px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-40"
          >
            {isPending ? "…" : resetDone ? "Сброшено ✓" : "Сброс"}
          </button>
        </div>
      </div>

      {/* Expanded: list of events with credit toggle */}
      {expanded && (
        <div className="border-t border-border">
          {apps.map((app) => (
            <CreditRow key={app.id} app={app} />
          ))}
        </div>
      )}

      {/* Email modal */}
      {showEmailModal && (
        <EmailModal
          user={user}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </div>
  );
}

function CreditRow({ app }: { app: Application }) {
  const [credited, setCredited] = useState(!!app.creditedAt);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !credited;
    setCredited(next);
    startTransition(async () => {
      const res = await toggleVolunteerCreditAction(app.id, next);
      if (res.error) setCredited(!next); // rollback on error
    });
  }

  return (
    <label className="flex cursor-pointer items-center gap-4 px-4 py-3 hover:bg-surface-2">
      <input
        type="checkbox"
        checked={credited}
        disabled={isPending}
        onChange={handleToggle}
        className="h-4 w-4 cursor-pointer accent-amber-500"
      />
      <div className="flex-1">
        <span className="text-sm font-medium text-ink">{app.event.race.name} {app.event.year}</span>
        <span className="ml-2 text-xs text-ink-faint">
          {new Date(app.event.dateISO).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      </div>
      <span className={`text-xs font-bold ${credited ? "text-amber-600 dark:text-amber-400" : "text-ink-faint"}`}>
        {isPending ? "…" : credited ? "В зачёте ✓" : "Не в зачёте"}
      </span>
    </label>
  );
}

// ─── Email Modal ─────────────────────────────────────────────────────────────

function EmailModal({
  user,
  onClose,
}: {
  user: Application["user"];
  onClose: () => void;
}) {
  const [textRu, setTextRu] = useState("");
  const [textKk, setTextKk] = useState("");
  const [textEn, setTextEn] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSend() {
    if (!promoCode.trim()) { setError("Введите промокод"); return; }
    if (!textRu.trim() && !textKk.trim() && !textEn.trim()) { setError("Введите текст хотя бы на одном языке"); return; }
    setError(null);
    startTransition(async () => {
      const res = await sendVolunteerRewardEmailAction(
        user.id, textRu, textKk, textEn, promoCode.trim()
      );
      if (res.ok) setSent(true);
      else setError("Ошибка отправки. Проверьте SMTP-настройки.");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-xl">
        {sent ? (
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">Письмо отправлено ✓</p>
            <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-[var(--radius-s)] bg-ember px-6 py-2 text-sm font-bold text-white hover:bg-ember-strong"
            >
              Закрыть
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-ink">Письмо волонтёру</h3>
                <p className="text-sm text-ink-soft">{user.firstName} {user.lastName} · {user.email}</p>
              </div>
              <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink">✕</button>
            </div>

            {/* Promo code */}
            <label className="mb-4 flex flex-col gap-1.5 text-sm">
              <span className="font-semibold text-ink">Промокод *</span>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="RIDDER100"
                className="rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-2 font-mono text-ink focus:border-ember focus:outline-none"
              />
            </label>

            {/* Text in 3 languages */}
            {(["RU", "KK", "EN"] as const).map((lang) => {
              const value = lang === "RU" ? textRu : lang === "KK" ? textKk : textEn;
              const setter = lang === "RU" ? setTextRu : lang === "KK" ? setTextKk : setTextEn;
              const placeholder =
                lang === "RU"
                  ? "Поздравляем! Вы отволонтёрили на 3 стартах…"
                  : lang === "KK"
                  ? "Құттықтаймыз! Сіз 3 жарыста еріктілік жасадыңыз…"
                  : "Congratulations! You volunteered at 3 events…";
              return (
                <label key={lang} className="mb-3 flex flex-col gap-1.5 text-sm">
                  <span className="font-semibold text-ink-soft">{lang}</span>
                  <textarea
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className="resize-y rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-2 text-ink focus:border-ember focus:outline-none"
                  />
                </label>
              );
            })}

            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={onClose}
                className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-2">
                Отмена
              </button>
              <button type="button" disabled={isPending} onClick={handleSend}
                className="rounded-[var(--radius-s)] bg-ember px-5 py-2 text-sm font-bold text-white hover:bg-ember-strong disabled:opacity-50">
                {isPending ? "Отправляем…" : "Отправить письмо"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Broadcast Modal ─────────────────────────────────────────────────────────

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTelegram() {
    if (!message.trim()) { setError("Введите текст сообщения"); return; }
    setError(null);
    startTransition(async () => {
      const res = await sendVolunteerBroadcastAction(message);
      if (res.ok) setSent(true);
      else if (res.error === "not_configured") setError("TELEGRAM_BOT_TOKEN или VOLUNTEER_TG_CHAT_ID не настроены в .env");
      else setError("Ошибка отправки в Telegram");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-xl">
        {sent ? (
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">Сообщение отправлено ✓</p>
            <p className="mt-1 text-sm text-ink-soft">Сообщение опубликовано в Telegram-канале волонтёров</p>
            <button type="button" onClick={onClose}
              className="mt-6 rounded-[var(--radius-s)] bg-ember px-6 py-2 text-sm font-bold text-white hover:bg-ember-strong">
              Закрыть
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start justify-between">
              <h3 className="font-display text-lg font-bold text-ink">Рассылка волонтёрам</h3>
              <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink">✕</button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Текст сообщения для волонтёров…"
              rows={6}
              className="w-full resize-y rounded-[var(--radius-s)] border border-border bg-surface-2 px-3 py-2 text-sm text-ink focus:border-ember focus:outline-none"
            />

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={isPending || !message.trim()}
                onClick={handleTelegram}
                className="flex-1 rounded-[var(--radius-s)] bg-[#229ED9] py-2.5 text-sm font-bold text-white hover:bg-[#1a8bbf] disabled:opacity-50"
              >
                {isPending ? "Отправляем…" : "📨 Отправить в Telegram"}
              </button>
              <button
                type="button"
                disabled
                title="WhatsApp Business API — планируется"
                className="flex-1 cursor-not-allowed rounded-[var(--radius-s)] bg-surface-2 py-2.5 text-sm font-bold text-ink-faint"
              >
                💬 WhatsApp (скоро)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TabButton({ active, onClick, badge, children }: {
  active: boolean; onClick: () => void; badge: number; children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`relative -mb-px flex items-center gap-1.5 border-b-2 pb-3 pr-2 text-sm font-semibold transition-colors ${
        active ? "border-ember text-ember" : "border-transparent text-ink-soft hover:text-ink"
      }`}
    >
      {children}
      {badge > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{label}</span>
      <p className="mt-0.5 text-ink">{value}</p>
    </div>
  );
}
