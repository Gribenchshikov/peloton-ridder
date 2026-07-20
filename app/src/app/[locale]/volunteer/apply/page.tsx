import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { ApplyForm } from "./ApplyForm";

export default async function VolunteerApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { locale } = await params;
  const { eventId } = await searchParams;

  const userId = await requireUserId();
  if (!userId) {
    redirect({ href: { pathname: "/login", query: { callbackUrl: "/volunteer/apply" } }, locale });
    return;
  }

  const events = await prisma.event.findMany({
    where: { status: { in: ["OPEN", "DRAFT"] } },
    orderBy: { dateISO: "asc" },
    select: { id: true, year: true, race: { select: { name: true } } },
  });

  const formattedEvents = events.map((e) => ({
    id: e.id,
    year: e.year,
    raceName: e.race.name,
  }));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="mb-8">
        <Link href="/" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
          ← На главную
        </Link>
        <span className="text-xs font-bold uppercase tracking-wide text-ember">Волонтёрство</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">Стать волонтёром</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Заполните анкету — организаторы рассмотрят заявку и свяжутся с вами.
        </p>
      </div>

      {formattedEvents.length === 0 ? (
        <p className="rounded-[var(--radius-m)] border border-dashed border-border p-8 text-center text-sm text-ink-faint">
          Сейчас нет открытых событий для волонтёрства. Следите за обновлениями!
        </p>
      ) : (
        <div className="rounded-[var(--radius-m)] border border-border bg-surface p-6">
          <ApplyForm events={formattedEvents} preselectedEventId={eventId} />
        </div>
      )}
    </main>
  );
}
