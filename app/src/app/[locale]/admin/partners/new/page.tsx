import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PartnerForm } from "../PartnerForm";
import { createPartnerAction } from "../actions";

export default async function NewPartnerPage() {
  const locale = await getLocale();
  const adminId = await requireAdminId();
  if (!adminId) redirect({ href: "/", locale });
  const t = await getTranslations("Admin");

  const boundAction = createPartnerAction.bind(null, locale) as (prev: { error?: string; success?: boolean }, fd: FormData) => Promise<{ error?: string; success?: boolean }>;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <Link href="/admin/partners" className="mb-4 block text-sm font-semibold text-ink-faint hover:text-ink">
        ← {t("partnersTitle")}
      </Link>
      <h1 className="mb-8 font-display text-2xl font-bold text-ink">{t("newPartnerTitle")}</h1>
      <PartnerForm action={boundAction} submitLabel={t("createSubmitCta")} />
    </main>
  );
}
