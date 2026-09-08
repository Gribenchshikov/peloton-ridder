import type { getEventForAdmin } from "@/lib/queries";
import { AdminFormHeader } from "../AdminFormHeader";
import { MassEventForm } from "../MassEventForm";
import { PublishToggle } from "./PublishToggle";
import { DeleteEventButton } from "./DeleteEventButton";
import { AboutSection } from "./AboutSection";
import { MediaLinksSection } from "./MediaLinksSection";
import { PhotosSection } from "./PhotosSection";
import { DayProgramSection } from "./DayProgramSection";
import { HowToGetSection } from "./HowToGetSection";
import { deleteEventAction } from "../actions";
import type { PhotoLink, DayProgramItem } from "@/types/eventContent";

type EventWithDetails = NonNullable<Awaited<ReturnType<typeof getEventForAdmin>>>;

export function MassEventEditView({
  event,
  locale,
}: {
  event: EventWithDetails;
  locale: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <AdminFormHeader title={`${event.race.name} ${event.year}`} />

      <MassEventForm
        mode="edit"
        eventId={event.id}
        defaults={{
          year: event.year,
          dateISO: event.dateISO,
          location: event.location,
          locationUrl: event.locationUrl,
          status: event.status,
          isFeatured: event.isFeatured,
          coverImageUrl: event.coverImageUrl,
          raceName: event.race.name,
        }}
      />

      <section>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">О мероприятии</div>
        <AboutSection eventId={event.id} initialAboutText={event.aboutText ?? ""} />
      </section>

      <section>
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-faint">Фото и видео</div>
        <MediaLinksSection
          eventId={event.id}
          initialLinks={(event.photoLinks as PhotoLink[] | null) ?? []}
        />
        <div className="mt-6">
          <PhotosSection
            eventId={event.id}
            initialPhotos={(event.eventPhotos as string[] | null) ?? []}
          />
        </div>
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
          initialUrl={event.howToGetUrl ?? null}
        />
      </section>

      <div className="border-t border-border pt-6">
        <PublishToggle eventId={event.id} initialIsPublished={event.isPublished} />
      </div>

      <div className="border-t border-danger/20 pt-6">
        <div className="mb-3 text-xs font-bold uppercase tracking-wide text-danger/60">Опасная зона</div>
        <DeleteEventButton action={deleteEventAction.bind(null, locale, event.id)} />
      </div>
    </main>
  );
}
