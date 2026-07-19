import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PartnerForm } from "../PartnerForm";
import { updatePartnerAction, deletePartnerAction } from "../actions";
import { DeleteButton } from "./DeleteButton";

type BoundAction = (prev: { error?: string; success?: boolean }, fd: FormData) => Promise<{ error?: string; success?: boolean }>;

export default async function EditPartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const locale = await getLocale();
  const adminId = await requireAdminId();
  if (!adminId) redirect({ href: "/", locale });

  const { id } = await params;
  const partner = await prisma.partner.findUnique({ where: { id } });
  if (!partner) notFound();

  const t = await getTranslations("Admin");
  const boundUpdate = updatePartnerAction.bind(null, locale, id) as unknown as BoundAction;
  const boundDelete = deletePartnerAction.bind(null, locale, id) as () => Promise<void>;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <Link href="/admin/partners" className="mb-4 block text-sm font-semibold text-ink-faint hover:text-ink">
        ← {t("partnersTitle")}
      </Link>
      <h1 className="mb-8 font-display text-2xl font-bold text-ink">{partner.name}</h1>
      <PartnerForm
        action={boundUpdate}
        defaultValues={{ name: partner.name, logoUrl: partner.logoUrl, websiteUrl: partner.websiteUrl ?? "" }}
        submitLabel={t("saveSubmitCta")}
        extra={
          <DeleteButton
            deleteAction={boundDelete}
            cancelLabel={t("cancelCta")}
            confirmLabel={t("deleteConfirmCta")}
            deleteLabel={t("deleteCta")}
          />
        }
      />
    </main>
  );
}
