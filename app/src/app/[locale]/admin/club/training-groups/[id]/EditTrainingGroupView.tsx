"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AdminFormHeader } from "../../../events/AdminFormHeader";
import { TrainingGroupForm } from "../../TrainingGroupForm";
import { updateTrainingGroupAction, deleteTrainingGroupAction } from "../../actions";
import type { TrainingGroup } from "@/generated/prisma/client";

export function EditTrainingGroupView({ locale, group }: { locale: string; group: TrainingGroup }) {
  const t = useTranslations("Admin");
  const router = useRouter();

  const action = updateTrainingGroupAction.bind(null, locale, group.id);

  async function handleDelete() {
    if (!confirm(t("deleteConfirmLabel"))) return;
    await deleteTrainingGroupAction(locale, group.id);
    router.push("/admin/club");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <AdminFormHeader title={group.title} />
      <TrainingGroupForm
        mode="edit"
        action={action}
        defaultValues={group}
        onDelete={handleDelete}
      />
    </main>
  );
}
