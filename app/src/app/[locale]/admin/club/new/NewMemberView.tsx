"use client";

import { useTranslations } from "next-intl";
import { AdminFormHeader } from "../../events/AdminFormHeader";
import { MemberForm } from "../MemberForm";
import { createMemberAction } from "../actions";

export function NewMemberView({ locale }: { locale: string }) {
  const t = useTranslations("Admin");
  const action = createMemberAction.bind(null, locale);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <AdminFormHeader title={t("newMemberTitle")} backHref="/admin/club" />
      <MemberForm mode="create" locale={locale} action={action} />
    </main>
  );
}
