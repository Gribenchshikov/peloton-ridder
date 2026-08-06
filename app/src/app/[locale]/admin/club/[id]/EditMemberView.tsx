"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { AdminFormHeader } from "../../events/AdminFormHeader";
import { MemberForm } from "../MemberForm";
import { updateMemberAction, deleteMemberAction } from "../actions";
import type { TeamMember } from "@/generated/prisma/client";

export function EditMemberView({ locale, member }: { locale: string; member: TeamMember }) {
  const t = useTranslations("Admin");
  const router = useRouter();

  const action = updateMemberAction.bind(null, locale, member.id);

  async function handleDelete() {
    if (!confirm(t("deleteConfirmLabel"))) return;
    await deleteMemberAction(locale, member.id);
    router.push("/admin/club");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <AdminFormHeader title={member.name} backHref="/admin/club" />
      <MemberForm
        mode="edit"
        locale={locale}
        action={action}
        defaultValues={member}
        onDelete={handleDelete}
      />
    </main>
  );
}
