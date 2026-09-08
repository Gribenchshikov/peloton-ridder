"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AdminFormHeader } from "../AdminFormHeader";
import { EventForm } from "../EventForm";
import { OnlineEventForm } from "../OnlineEventForm";
import { MassEventForm } from "../MassEventForm";

type Race = { id: string; name: string; isChallenge: boolean; isMass: boolean };

export function NewEventView({ locale, races }: { locale: string; races: Race[] }) {
  const t = useTranslations("Admin");
  const router = useRouter();

  const offlineRaces = races.filter((r) => !r.isChallenge && !r.isMass);
  const onlineRaces = races.filter((r) => r.isChallenge && !r.isMass);
  const massRaces = races.filter((r) => r.isMass);

  const hasOnline = onlineRaces.length > 0;
  const hasOffline = offlineRaces.length > 0;

  const [type, setType] = useState<"offline" | "online" | "mass">(hasOffline ? "offline" : "mass");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <AdminFormHeader title={t("newEventTitle")} />
        <WizardStepper current={1} kind={type} />
      </div>

      <div className="flex gap-1 rounded-[var(--radius-s)] border border-border bg-surface p-1">
        {hasOffline && (
          <button
            type="button"
            onClick={() => setType("offline")}
            className={`flex-1 rounded-[var(--radius-s)] py-2.5 text-sm font-semibold transition-colors ${
              type === "offline" ? "bg-ember text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            Офлайн-забег
          </button>
        )}
        {hasOnline && (
          <button
            type="button"
            onClick={() => setType("online")}
            className={`flex-1 rounded-[var(--radius-s)] py-2.5 text-sm font-semibold transition-colors ${
              type === "online" ? "bg-ember text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            Онлайн-челлендж
          </button>
        )}
        <button
          type="button"
          onClick={() => setType("mass")}
          className={`flex-1 rounded-[var(--radius-s)] py-2.5 text-sm font-semibold transition-colors ${
            type === "mass" ? "bg-ember text-white" : "text-ink-soft hover:text-ink"
          }`}
        >
          Мероприятие
        </button>
      </div>

      {type === "offline" ? (
        <EventForm
          mode="create"
          locale={locale}
          races={offlineRaces}
          submitLabel={t("wizardNextCta")}
          onCreated={(id) => router.push(`/admin/events/${id}?wizard=2`)}
        />
      ) : type === "online" ? (
        <OnlineEventForm
          mode="create"
          locale={locale}
          races={onlineRaces}
          submitLabel="Создать →"
          onCreated={(id) => router.push(`/admin/events/${id}`)}
        />
      ) : (
        <MassEventForm
          mode="create"
          locale={locale}
          massRaces={massRaces}
          onCreated={(id) => router.push(`/admin/events/${id}`)}
        />
      )}
    </main>
  );
}

function WizardStepper({ current, kind }: { current: 1 | 2 | 3; kind: "offline" | "online" | "mass" }) {
  const t = useTranslations("Admin");

  if (kind !== "offline") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-ember">1. Основное</span>
        <span className="text-ink-faint">›</span>
        <span className="text-ink-faint">2. Публикация</span>
      </div>
    );
  }

  const steps: [1 | 2 | 3, string][] = [
    [1, t("wizardStep1Label")],
    [2, t("wizardStep2Label")],
    [3, t("wizardStep3Label")],
  ];
  return (
    <div className="flex items-center gap-2 text-sm">
      {steps.map(([num, label], i) => (
        <span key={num} className="flex items-center gap-2">
          <span
            className={
              num === current ? "font-semibold text-ember" : num < current ? "text-ink-soft" : "text-ink-faint"
            }
          >
            {num < current ? "✓" : num}. {label}
          </span>
          {i < steps.length - 1 && <span className="text-ink-faint">›</span>}
        </span>
      ))}
    </div>
  );
}
