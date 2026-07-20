import { useTranslations } from "next-intl";
import type { getEventForAdmin } from "@/lib/queries";
import { Link } from "@/i18n/navigation";
import { AdminFormHeader } from "../AdminFormHeader";
import { EventForm } from "../EventForm";
import { DistancesSection } from "./DistancesSection";
import { MerchSection } from "./MerchSection";
import { PartnersSection } from "./PartnersSection";
import { RegulationsSection } from "./RegulationsSection";
import { AboutSection } from "./AboutSection";
import { DayProgramSection } from "./DayProgramSection";
import { HowToGetSection } from "./HowToGetSection";
import { EquipmentSection } from "./EquipmentSection";
import { ResultsSection } from "./ResultsSection";
import { NotifySection } from "./NotifySection";
import { DeleteEventButton } from "./DeleteEventButton";
import { deleteEventAction } from "../actions";
import type { Partner, Result } from "@/generated/prisma/client";
import type { AidStation } from "@/types/aidStation";
import type { RegulationFile, RegulationBlock } from "@/types/regulation";
import type { PhotoLink, DayProgramItem, DistanceEquipment } from "@/types/eventContent";

type EventWithDetails = NonNullable<Awaited<ReturnType<typeof getEventForAdmin>>>;

function WizardStepper({ current }: { current: 2 | 3 }) {
  const t = useTranslations("Admin");
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-ink-soft">✓ 1. {t("wizardStep1Label")}</span>
      <span className="text-ink-faint">›</span>
      <span className={current === 2 ? "font-semibold text-ember" : "text-ink-soft"}>
        {current > 2 ? "✓ " : ""}2. {t("wizardStep2Label")}
      </span>
      <span className="text-ink-faint">›</span>
      <span className={current === 3 ? "font-semibold text-ember" : "text-ink-faint"}>
        3. {t("wizardStep3Label")}
      </span>
    </div>
  );
}

export function EventEditView({ event, allPartners, wizard, locale, lastNotification }: { event: EventWithDetails; allPartners: Partner[]; wizard?: "2" | "3"; locale: string; lastNotification?: { subject: string; sentAt: Date } | null }) {
  const t = useTranslations("Admin");

  if (wizard === "2") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-3">
          <AdminFormHeader title={t("distancesTitle")} />
          <WizardStepper current={2} />
        </div>
        <DistancesSection
          eventId={event.id}
          distances={event.distances.map(({ aidStations, ...d }) => ({
            ...d,
            hasProfile: d.profileData != null,
            aidStations: (aidStations as AidStation[] | null) ?? [],
            raceStartMinutes: d.raceStartMinutes ?? null,
          }))}
        />
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/events/${event.id}?wizard=3`}
            className="rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
          >
            {t("wizardNextCta")}
          </Link>
          <Link
            href={`/admin/events/${event.id}`}
            className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink"
          >
            {t("wizardDoneCta")}
          </Link>
        </div>
      </main>
    );
  }

  if (wizard === "3") {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
        <div className="flex flex-col gap-3">
          <AdminFormHeader title={t("merchTitle")} />
          <WizardStepper current={3} />
        </div>
        <MerchSection eventId={event.id} items={event.merchItems} />
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
          >
            {t("wizardDoneCta")}
          </Link>
          <Link
            href={`/admin/events/${event.id}?wizard=2`}
            className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink"
          >
            ← {t("wizardBackCta")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminFormHeader title={t("editEventTitle", { name: `${event.race.name} ${event.year}` })} />
        <Link
          href={`/admin/events/${event.id}/registrations`}
          className="shrink-0 rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          {t("viewRegistrationsCta")}
        </Link>
      </div>

      <EventForm
        mode="edit"
        eventId={event.id}
        raceName={event.race.name}
        defaults={{
          year: event.year,
          dateISO: event.dateISO,
          location: event.location,
          status: event.status,
          isFeatured: event.isFeatured,
          registrationDeadline: event.registrationDeadline,
          cancellationDeadline: event.cancellationDeadline,
          medicalCancellationDeadline: event.medicalCancellationDeadline,
          transferPrice: event.transferPrice,
          resultsUrl: event.resultsUrl,
          coverImageUrl: event.coverImageUrl,
          volunteerChatUrl: event.volunteerChatUrl,
        }}
      />

      <DistancesSection
        eventId={event.id}
        distances={event.distances.map(({ aidStations, ...d }) => ({
          ...d,
          hasProfile: d.profileData != null,
          aidStations: (aidStations as AidStation[] | null) ?? [],
          raceStartMinutes: d.raceStartMinutes ?? null,
        }))}
      />
      <MerchSection eventId={event.id} items={event.merchItems} />
      <PartnersSection
        eventId={event.id}
        linked={event.eventPartners}
        all={allPartners}
      />
      <RegulationsSection
        eventId={event.id}
        initialFiles={(event.regulationFiles as RegulationFile[] | null) ?? []}
        initialBlocks={(event.regulationBlocks as RegulationBlock[] | null) ?? []}
        initialWaiverFiles={(event.waiverFiles as RegulationFile[] | null) ?? []}
      />

      <section>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">О забеге</div>
        <AboutSection
          eventId={event.id}
          initialAboutText={event.aboutText ?? ""}
          initialPhotoLinks={(event.photoLinks as PhotoLink[] | null) ?? []}
        />
      </section>

      <section>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">Программа дня</div>
        <DayProgramSection
          eventId={event.id}
          initialItems={(event.dayProgram as DayProgramItem[] | null) ?? []}
        />
      </section>

      <section>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">Как добраться</div>
        <HowToGetSection
          eventId={event.id}
          initialText={event.howToGet ?? ""}
        />
      </section>

      <section>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">Снаряжение</div>
        <EquipmentSection
          eventId={event.id}
          distances={event.distances.map((d) => ({ id: d.id, name: d.name, km: d.km }))}
          initialEquipment={(event.distanceEquipment as DistanceEquipment | null) ?? {}}
        />
      </section>

      <ResultsSection
        eventId={event.id}
        initialResults={(event.results ?? []) as Result[]}
      />

      <div className="border-t border-border pt-6">
        <NotifySection eventId={event.id} lastNotification={lastNotification} />
      </div>

      <div className="border-t border-danger/20 pt-6">
        <div className="text-xs font-bold uppercase tracking-wide text-danger/60 mb-3">Опасная зона</div>
        <DeleteEventButton action={deleteEventAction.bind(null, locale, event.id)} />
      </div>
    </main>
  );
}
