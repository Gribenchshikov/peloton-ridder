"use client";

import { useState, useTransition } from "react";
import { reviewVolunteerAction } from "./actions";

type Application = {
  id: string;
  status: string;
  motivation: string;
  experience: string;
  stravaUrl: string | null;
  availability: string;
  createdAt: Date;
  user: { firstName: string; lastName: string; email: string; phone: string | null };
  event: { year: number; race: { name: string } };
};

export function VolunteersView({ applications }: { applications: Application[] }) {
  const pending = applications.filter((a) => a.status === "PENDING");
  const reviewed = applications.filter((a) => a.status !== "PENDING");

  return (
    <div className="flex flex-col gap-10">
      <ApplicationList title="Ожидают рассмотрения" items={pending} showActions />
      {reviewed.length > 0 && (
        <ApplicationList title="Рассмотренные" items={reviewed} showActions={false} />
      )}
      {applications.length === 0 && (
        <p className="text-sm text-ink-faint">Заявок пока нет.</p>
      )}
    </div>
  );
}

function ApplicationList({
  title,
  items,
  showActions,
}: {
  title: string;
  items: Application[];
  showActions: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-4 font-display text-base font-bold text-ink">
        {title} <span className="text-ink-faint">({items.length})</span>
      </h2>
      <div className="flex flex-col gap-4">
        {items.map((app) => (
          <ApplicationCard key={app.id} app={app} showActions={showActions} />
        ))}
      </div>
    </section>
  );
}

function ApplicationCard({ app, showActions }: { app: Application; showActions: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);

  function handle(d: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      await reviewVolunteerAction(app.id, d);
      setDecision(d);
      setDone(true);
    });
  }

  const statusLabel =
    app.status === "APPROVED" ? "Одобрено ✓" : app.status === "REJECTED" ? "Отклонено ✗" : "Ожидает";
  const statusColor =
    app.status === "APPROVED" ? "text-success" : app.status === "REJECTED" ? "text-danger" : "text-ink-soft";

  return (
    <div className="rounded-[var(--radius-m)] border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink">
            {app.user.firstName} {app.user.lastName}
          </p>
          <p className="text-sm text-ink-soft">{app.user.email}{app.user.phone ? ` · ${app.user.phone}` : ""}</p>
          <p className="mt-1 text-xs font-semibold text-ember">
            {app.event.race.name} {app.event.year}
          </p>
        </div>
        <span className={`text-xs font-bold uppercase tracking-wide ${statusColor}`}>
          {done ? (decision === "APPROVED" ? "Одобрено ✓" : "Отклонено ✗") : statusLabel}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm">
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
              className="mt-0.5 block text-ember hover:underline"
            >
              {app.stravaUrl}
            </a>
          </div>
        )}
      </div>

      {showActions && !done && (
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handle("APPROVED")}
            className="rounded-[var(--radius-s)] bg-success/10 px-4 py-2 text-sm font-bold text-success transition-colors hover:bg-success/20 disabled:opacity-50"
          >
            {isPending ? "…" : "Одобрить"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => handle("REJECTED")}
            className="rounded-[var(--radius-s)] bg-danger/10 px-4 py-2 text-sm font-bold text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
          >
            {isPending ? "…" : "Отклонить"}
          </button>
        </div>
      )}
    </div>
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
