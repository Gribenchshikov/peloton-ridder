import type { getEventForAdmin } from "@/lib/queries";
import { AdminFormHeader } from "../AdminFormHeader";
import { OnlineEventForm } from "../OnlineEventForm";
import { PublishToggle } from "./PublishToggle";
import { DeleteEventButton } from "./DeleteEventButton";
import { NotifySection } from "./NotifySection";
import { AboutSection } from "./AboutSection";
import { deleteEventAction } from "../actions";
import type { PhotoLink } from "@/types/eventContent";

type EventWithDetails = NonNullable<Awaited<ReturnType<typeof getEventForAdmin>>>;

export function OnlineEventEditView({
  event,
  allRaces,
  locale,
  lastNotification,
}: {
  event: EventWithDetails;
  allRaces: { id: string; name: string }[];
  locale: string;
  lastNotification?: { subject: string; sentAt: Date } | null;
}) {
  const participation = event.distances.find((d) => d.km === 0) ?? event.distances[0];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <AdminFormHeader
        title={`${event.race.name} ${event.year}`}
      />

      <OnlineEventForm
        mode="edit"
        eventId={event.id}
        races={allRaces}
        currentRaceId={event.race.id}
        raceName={event.race.name}
        defaults={{
          year: event.year,
          dateISO: event.dateISO,
          challengeWindowEnd: event.challengeWindowEnd ?? event.dateISO,
          registrationDeadline: event.registrationDeadline,
          status: event.status,
          isFeatured: event.isFeatured,
          price: participation?.price ?? 0,
          maxSlots: participation?.maxSlots ?? null,
          coverImageUrl: event.coverImageUrl,
        }}
      />

      <section>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">О мероприятии</div>
        <AboutSection
          eventId={event.id}
          initialAboutText={event.aboutText ?? ""}
          initialPhotoLinks={(event.photoLinks as PhotoLink[] | null) ?? []}
        />
      </section>

      <div className="border-t border-border pt-6">
        <PublishToggle eventId={event.id} initialIsPublished={event.isPublished} />
      </div>

      <div className="border-t border-border pt-6">
        <NotifySection eventId={event.id} lastNotification={lastNotification} />
      </div>

      <div className="border-t border-danger/20 pt-6">
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-danger/60">Опасная зона</div>
        <DeleteEventButton action={deleteEventAction.bind(null, locale, event.id)} />
      </div>
    </main>
  );
}
