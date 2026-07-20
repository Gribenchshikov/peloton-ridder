"use client";

import { useState, useTransition } from "react";
import { reviewVolunteerAction, revokeVolunteerAction } from "./actions";

type Application = {
  id: string;
  status: string;
  motivation: string;
  experience: string;
  stravaUrl: string | null;
  availability: string;
  createdAt: Date;
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

  const pending = applications.filter((a) => a.status === "PENDING");
  const approved = applications.filter((a) => a.status === "APPROVED");
  const rejected = applications.filter((a) => a.status === "REJECTED");
  const reviewed = [...approved, ...rejected].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Group approved by event for volunteers tab
  const now = new Date();
  const upcomingEvents = new Map<string, { eventLabel: string; chatUrl: string | null; volunteers: Application[] }>();
  const pastEvents = new Map<string, { eventLabel: string; chatUrl: string | null; volunteers: Application[] }>();

  for (const app of approved) {
    const key = app.event.id;
    const label = `${app.event.race.name} ${app.event.year}`;
    const isUpcoming = new Date(app.event.dateISO) >= now;
    const map = isUpcoming ? upcomingEvents : pastEvents;
    if (!map.has(key)) {
      map.set(key, { eventLabel: label, chatUrl: app.event.volunteerChatUrl, volunteers: [] });
    }
    map.get(key)!.volunteers.push(app);
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-border">
        <TabButton active={tab === "applications"} onClick={() => setTab("applications")} badge={pending.length}>
          Заявки
        </TabButton>
        <TabButton active={tab === "volunteers"} onClick={() => setTab("volunteers")} badge={0}>
          Волонтёры ({approved.length})
        </TabButton>
      </div>

      {tab === "applications" && (
        <ApplicationsTab pending={pending} reviewed={reviewed} />
      )}
      {tab === "volunteers" && (
        <VolunteersTab upcomingEvents={upcomingEvents} pastEvents={pastEvents} />
      )}
    </div>
  );
}

// ─── Tab: Заявки ─────────────────────────────────────────────────────────────

function ApplicationsTab({
  pending,
  reviewed,
}: {
  pending: Application[];
  reviewed: Application[];
}) {
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
            {pending.map((app) => (
              <PendingCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      )}

      {reviewed.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-faint">
            Рассмотренные · {reviewed.length}
          </h2>
          <div className="flex flex-col gap-2">
            {reviewed.map((app) => (
              <ReviewedRow key={app.id} app={app} />
            ))}
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
        <span
          className={`text-xs font-bold uppercase tracking-wide ${
            decision === "APPROVED" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
          }`}
        >
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
      {/* Header — always visible, click to expand/collapse */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <span className="font-semibold text-ink">
            {app.user.firstName} {app.user.lastName}
          </span>
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
          <p className="mb-1 text-xs text-ink-faint">
            {app.user.email}
            {app.user.phone ? ` · ${app.user.phone}` : ""}
          </p>
          <div className="mt-3 flex flex-col gap-3 text-sm">
            <Field label="Мотивация" value={app.motivation} />
            <Field label="Опыт" value={app.experience} />
            <Field label="Доступность" value={app.availability} />
            {app.stravaUrl && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Strava</span>
                <a
                  href={app.stravaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block truncate text-ember hover:underline"
                >
                  {app.stravaUrl}
                </a>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => handle("APPROVED")}
              className="rounded-[var(--radius-s)] bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? "…" : "Одобрить"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handle("REJECTED")}
              className="rounded-[var(--radius-s)] border border-border bg-transparent px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-2 disabled:opacity-50"
            >
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
        <span className="text-sm font-medium text-ink">
          {app.user.firstName} {app.user.lastName}
        </span>
        <span className="text-xs text-ink-faint">
          {app.event.race.name} {app.event.year}
        </span>
      </div>
      <span
        className={`text-xs font-bold uppercase tracking-wide ${
          isApproved ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
        }`}
      >
        {isApproved ? "Одобрено" : "Отклонено"}
      </span>
    </div>
  );
}

// ─── Tab: Волонтёры ──────────────────────────────────────────────────────────

function VolunteersTab({
  upcomingEvents,
  pastEvents,
}: {
  upcomingEvents: Map<string, { eventLabel: string; chatUrl: string | null; volunteers: Application[] }>;
  pastEvents: Map<string, { eventLabel: string; chatUrl: string | null; volunteers: Application[] }>;
}) {
  if (upcomingEvents.size === 0 && pastEvents.size === 0) {
    return <p className="text-sm text-ink-faint">Одобренных волонтёров пока нет.</p>;
  }

  return (
    <div className="flex flex-col gap-10">
      {upcomingEvents.size > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-faint">
            Предстоящие забеги
          </h2>
          <div className="flex flex-col gap-6">
            {[...upcomingEvents.entries()].map(([eventId, { eventLabel, chatUrl, volunteers }]) => (
              <EventVolunteerGroup
                key={eventId}
                eventLabel={eventLabel}
                chatUrl={chatUrl}
                volunteers={volunteers}
              />
            ))}
          </div>
        </section>
      )}

      {pastEvents.size > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-faint">
            Прошедшие забеги
          </h2>
          <div className="flex flex-col gap-6">
            {[...pastEvents.entries()].map(([eventId, { eventLabel, chatUrl, volunteers }]) => (
              <EventVolunteerGroup
                key={eventId}
                eventLabel={eventLabel}
                chatUrl={chatUrl}
                volunteers={volunteers}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EventVolunteerGroup({
  eventLabel,
  chatUrl,
  volunteers,
}: {
  eventLabel: string;
  chatUrl: string | null;
  volunteers: Application[];
}) {
  return (
    <div className="rounded-[var(--radius-m)] border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <span className="font-semibold text-ink">{eventLabel}</span>
          <span className="ml-2 text-xs text-ink-faint">{volunteers.length} чел.</span>
        </div>
        {chatUrl && (
          <a
            href={chatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-ember hover:underline"
          >
            Чат волонтёров →
          </a>
        )}
      </div>
      <ul className="divide-y divide-border">
        {volunteers.map((v) => (
          <VolunteerRow key={v.id} app={v} />
        ))}
      </ul>
    </div>
  );
}

function VolunteerRow({ app }: { app: Application }) {
  const [isPending, startTransition] = useTransition();
  const [revoked, setRevoked] = useState(false);

  if (revoked) {
    return (
      <li className="flex items-center gap-3 px-4 py-3 opacity-40">
        <span className="text-sm text-ink line-through">
          {app.user.firstName} {app.user.lastName}
        </span>
        <span className="text-xs text-ink-faint">Удалён</span>
      </li>
    );
  }

  function handleRevoke() {
    startTransition(async () => {
      const res = await revokeVolunteerAction(app.id);
      if (res.ok) setRevoked(true);
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <span className="text-sm font-medium text-ink">
          {app.user.firstName} {app.user.lastName}
        </span>
        <span className="ml-2 text-xs text-ink-faint">{app.user.email}</span>
        {app.user.phone && (
          <span className="ml-2 text-xs text-ink-faint">{app.user.phone}</span>
        )}
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={handleRevoke}
        className="rounded-[var(--radius-s)] border border-border px-3 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-40"
      >
        {isPending ? "…" : "Удалить"}
      </button>
    </li>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  badge: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative -mb-px flex items-center gap-1.5 border-b-2 pb-3 pr-2 text-sm font-semibold transition-colors ${
        active
          ? "border-ember text-ember"
          : "border-transparent text-ink-soft hover:text-ink"
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
