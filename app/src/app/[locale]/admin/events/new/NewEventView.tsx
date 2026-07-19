"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AdminFormHeader } from "../AdminFormHeader";
import { EventForm } from "../EventForm";

export function NewEventView({ locale, races }: { locale: string; races: { id: string; name: string }[] }) {
  const t = useTranslations("Admin");
  const router = useRouter();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <AdminFormHeader title={t("newEventTitle")} />
        <WizardStepper current={1} />
      </div>
      <EventForm
        mode="create"
        locale={locale}
        races={races}
        submitLabel={t("wizardNextCta")}
        onCreated={(id) => router.push(`/admin/events/${id}?wizard=2`)}
      />
    </main>
  );
}

function WizardStepper({ current }: { current: 1 | 2 | 3 }) {
  const t = useTranslations("Admin");
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
