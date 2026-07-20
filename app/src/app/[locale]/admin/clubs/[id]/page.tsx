import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { ClubForm } from "../ClubForm";
import { DeleteClubButton } from "./DeleteClubButton";

export default async function EditClubPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  await requireAdminPage(locale, `/admin/clubs/${id}`);

  const [t, club] = await Promise.all([
    getTranslations("Admin"),
    prisma.runningClub.findUnique({
      where: { id },
      include: { _count: { select: { registrations: true } } },
    }),
  ]);
  if (!club) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/clubs" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
            ← {t("backToClubsCta")}
          </Link>
          <h1 className="font-display text-2xl font-bold text-ink">{club.name}</h1>
          <p className="mt-1 text-sm text-ink-faint">{club._count.registrations} регистраций с этим клубом</p>
        </div>
        <DeleteClubButton clubId={id} locale={locale} label={t("deleteCta")} disabled={club._count.registrations > 0} />
      </div>

      <ClubForm mode="edit" locale={locale} clubId={id} defaults={{ name: club.name, city: club.city }} />
    </main>
  );
}
