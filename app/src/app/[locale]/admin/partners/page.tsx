import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { publicAssetUrl } from "@/lib/publicAssetUrl";

export default async function PartnersPage() {
  const adminId = await requireAdminId();
  if (!adminId) redirect({ href: "/", locale: await getLocale() });

  const partners = await prisma.partner.findMany({ orderBy: { name: "asc" } });
  const t = await getTranslations("Admin");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
            ← {t("backToAdminCta")}
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink">{t("partnersTitle")}</h1>
        </div>
        <Link
          href="/admin/partners/new"
          className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
        >
          {t("createPartnerCta")}
        </Link>
      </div>

      {partners.length === 0 ? (
        <p className="text-sm text-ink-faint">{t("partnersEmpty")}</p>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-m)] border border-border">
          {partners.map((p) => (
            <div key={p.id} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={publicAssetUrl(p.logoUrl) ?? p.logoUrl} alt={p.name} className="h-8 w-16 object-contain" />
              <div className="flex-1">
                <span className="font-semibold text-ink">{p.name}</span>
                {p.websiteUrl && (
                  <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-ink-faint hover:text-ember">
                    {p.websiteUrl}
                  </a>
                )}
              </div>
              <Link
                href={`/admin/partners/${p.id}`}
                className="text-sm font-semibold text-ink-soft hover:text-ink"
              >
                {t("editCta")}
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
