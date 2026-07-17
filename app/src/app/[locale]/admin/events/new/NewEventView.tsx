import { useTranslations } from "next-intl";
import { AdminFormHeader } from "../AdminFormHeader";
import { EventForm } from "../EventForm";

export function NewEventView({ locale, races }: { locale: string; races: { id: string; name: string }[] }) {
  const t = useTranslations("Admin");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <AdminFormHeader title={t("newEventTitle")} />
      <EventForm mode="create" locale={locale} races={races} />
    </main>
  );
}
