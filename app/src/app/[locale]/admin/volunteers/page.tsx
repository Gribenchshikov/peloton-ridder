import { requireAdminPage } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { VolunteersView } from "./VolunteersView";

export default async function AdminVolunteersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/volunteers");

  const applications = await prisma.volunteerApplication.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      motivation: true,
      experience: true,
      stravaUrl: true,
      availability: true,
      createdAt: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      event: {
        select: {
          id: true,
          year: true,
          dateISO: true,
          volunteerChatUrl: true,
          race: { select: { name: true } },
        },
      },
    },
  });

  const pendingCount = applications.filter((a) => a.status === "PENDING").length;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="mb-8">
        <Link href="/admin" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
          ← Админка
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl font-bold text-ink">Волонтёры</h1>
          {pendingCount > 0 && (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ember px-1.5 text-xs font-bold text-white">
              {pendingCount}
            </span>
          )}
        </div>
      </div>
      <VolunteersView applications={applications} />
    </main>
  );
}
