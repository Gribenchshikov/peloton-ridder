"use client";

import { useTranslations } from "next-intl";
import { AdminFormHeader } from "../../../events/AdminFormHeader";
import { TrainingGroupForm } from "../../TrainingGroupForm";
import { createTrainingGroupAction } from "../../actions";

export function NewTrainingGroupView({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const action = createTrainingGroupAction.bind(null, locale);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <AdminFormHeader title={t("newTrainingGroupTitle")} backHref="/admin/club" backLabel={t("backToClubCta")} />
      <TrainingGroupForm mode="create" action={action} />
    </main>
  );
}
