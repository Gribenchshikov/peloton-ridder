import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getKitPickupListBySlug } from "@/lib/queries";
import { KitPickupSearch } from "./KitPickupSearch";

export default async function KitPickupListPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; year: string }>;
}) {
  const { locale, slug, year } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/${locale}/login?callbackUrl=/admin/registrations/${slug}/${year}/kit`);
  }

  const isStaff = session.user.isAdmin || session.user.isOperator;
  if (!isStaff) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isVolunteer: true },
    });
    if (!user?.isVolunteer) redirect(`/${locale}`);
  }

  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) notFound();

  const event = await getKitPickupListBySlug(slug, yearNum);
  if (!event) notFound();

  const regs = event.registrations;
  const pickedUp = regs.filter((r) => r.kitPickedUpAt !== null);
  const notPickedUp = regs.filter((r) => r.kitPickedUpAt === null);

  const backHref = `/admin/registrations/${slug}/${year}`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <Link href={backHref} className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink">
          ← {event.race.name} {event.year}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Выдача стартовых наборов</h1>
            <p className="mt-1 text-sm text-ink-soft">Только оплаченные регистрации</p>
          </div>
          <Link
            href="/volunteer/scan"
            className="flex items-center gap-2 rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <path d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3v3M21 14v2" />
            </svg>
            QR-сканер выдачи
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4">
          <div className="text-2xl font-bold text-spruce">{pickedUp.length}</div>
          <div className="mt-0.5 text-xs text-ink-soft">Получили набор</div>
        </div>
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4">
          <div className="text-2xl font-bold text-warn">{notPickedUp.length}</div>
          <div className="mt-0.5 text-xs text-ink-soft">Ещё не получили</div>
        </div>
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4">
          <div className="text-2xl font-bold text-ink">{regs.length}</div>
          <div className="mt-0.5 text-xs text-ink-soft">Всего участников</div>
        </div>
        {regs.length > 0 && (
          <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4">
            <div className="text-2xl font-bold text-ink">
              {Math.round((pickedUp.length / regs.length) * 100)}%
            </div>
            <div className="mt-0.5 text-xs text-ink-soft">Выдано</div>
          </div>
        )}
      </div>

      {/* Table */}
      {regs.length === 0 ? (
        <p className="text-sm text-ink-faint">Нет оплаченных регистраций</p>
      ) : (
        <>
          {/* Not picked up */}
          {notPickedUp.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-base font-bold text-warn">
                Ожидают выдачи ({notPickedUp.length})
              </h2>
              <KitPickupSearch regs={notPickedUp} />
            </section>
          )}

          {/* Picked up */}
          {pickedUp.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-base font-bold text-spruce">
                Получили набор ({pickedUp.length})
              </h2>
              <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      <th className="px-4 py-2.5 text-left">Рег. номер</th>
                      <th className="px-4 py-2.5 text-left">Участник</th>
                      <th className="px-4 py-2.5 text-left">Телефон</th>
                      <th className="px-4 py-2.5 text-left">Дистанция</th>
                      <th className="px-4 py-2.5 text-right">Выдано</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pickedUp.map((reg) => (
                      <tr key={reg.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                        <td className="px-4 py-2.5 tabular-nums font-bold text-ink">
                          {reg.bibNumber ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-ink">
                          {reg.user.firstName} {reg.user.lastName}
                        </td>
                        <td className="px-4 py-2.5 text-ink-soft">{reg.user.phone ?? "—"}</td>
                        <td className="px-4 py-2.5 text-ink-soft">{reg.distance?.name ?? "Трансфер"}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className="text-xs font-semibold text-spruce">
                            ✓{" "}
                            {new Intl.DateTimeFormat("ru", { timeStyle: "short", dateStyle: "short" }).format(
                              new Date(reg.kitPickedUpAt!)
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

    </main>
  );
}
