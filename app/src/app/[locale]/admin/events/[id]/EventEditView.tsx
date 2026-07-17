import { useTranslations } from "next-intl";
import type { getEventForAdmin } from "@/lib/queries";
import { AdminFormHeader } from "../AdminFormHeader";
import { EventForm } from "../EventForm";
import { DistancesSection } from "./DistancesSection";

type EventWithDetails = NonNullable<Awaited<ReturnType<typeof getEventForAdmin>>>;

export function EventEditView({ event }: { event: EventWithDetails }) {
  const t = useTranslations("Admin");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-16">
      <AdminFormHeader title={t("editEventTitle", { name: `${event.race.name} ${event.year}` })} />

      <EventForm
        mode="edit"
        eventId={event.id}
        raceName={event.race.name}
        defaults={{
          year: event.year,
          dateISO: event.dateISO,
          location: event.location,
          status: event.status,
          registrationDeadline: event.registrationDeadline,
          cancellationDeadline: event.cancellationDeadline,
          medicalCancellationDeadline: event.medicalCancellationDeadline,
          transferPrice: event.transferPrice,
          resultsUrl: event.resultsUrl,
          coverImageUrl: event.coverImageUrl,
          volunteerChatUrl: event.volunteerChatUrl,
        }}
      />

      <DistancesSection eventId={event.id} distances={event.distances} />
    </main>
  );
}
