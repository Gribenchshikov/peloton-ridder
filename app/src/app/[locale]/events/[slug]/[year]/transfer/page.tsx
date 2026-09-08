import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Icon } from "@/components/IconSprite";
import { getEventForRegistration } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { formatKzt } from "@/lib/currency";
import { useFormatter } from "next-intl";
import { BookTransferForm } from "./BookTransferForm";

export default async function TransferPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string; year: string }>;
}) {
  const { locale, slug, year } = await params;
  const [session, event] = await Promise.all([auth(), getEventForRegistration(slug, Number(year))]);

  if (!session?.user?.id) {
    return redirect({
      href: { pathname: "/login", query: { callbackUrl: `/events/${slug}/${year}/transfer` } },
      locale,
    });
  }
  if (!event) notFound();
  if (event.race.isMass) {
    return redirect({ href: `/events/${slug}/${year}`, locale });
  }
  if (event.status !== "OPEN" || !event.transferPrice || event.registrationDeadline < new Date()) {
    return redirect({ href: `/events/${slug}/${year}`, locale });
  }

  // Проверяем есть ли уже активная запись
  const existing = await prisma.registration.findFirst({
    where: {
      userId: session.user.id,
      eventId: event.id,
      status: { in: ["RESERVED", "PAID"] },
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <Link
          href={`/events/${event.race.slug}/${event.year}`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-faint transition-colors hover:text-ink"
        >
          <Icon name="i-arrow" className="h-4 w-4 rotate-180" />
          {event.race.name} {event.year}
        </Link>
        <span className="block text-xs font-bold uppercase tracking-wide text-ember">Трансфер</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">
          {event.race.name} {event.year}
        </h1>
      </div>

      {existing?.isTransferOnly || existing?.includesTransfer ? (
        <section className="rounded-[var(--radius-m)] border border-spruce/30 bg-spruce/5 p-6">
          <p className="font-semibold text-spruce">✓ Трансфер уже оформлен</p>
          <p className="mt-1 text-sm text-ink-soft">
            {existing.isTransferOnly
              ? "Вы заказали трансфер без участия в забеге."
              : "Трансфер включён в вашу регистрацию."}
          </p>
          <Link
            href={`/events/${event.race.slug}/${event.year}`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ember hover:underline"
          >
            К странице забега →
          </Link>
        </section>
      ) : (
        <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6">
          <h2 className="font-display text-base font-bold text-ink">Детали трансфера</h2>
          <dl className="mt-4 flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-faint">Маршрут</dt>
              <dd className="text-right font-semibold text-ink">
                {event.location
                  ? `${event.location} → место старта и обратно`
                  : "Риддер → место старта и обратно"}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <dt className="font-semibold text-ink">Стоимость</dt>
              <dd className="text-right font-bold text-ink">
                <TransferPrice price={event.transferPrice} />
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-ink-faint">
            Место в трансфере можно заказать отдельно — без регистрации на дистанцию.
          </p>
          <BookTransferForm eventId={event.id} locale={locale} />
        </section>
      )}
    </main>
  );
}

function TransferPrice({ price }: { price: number }) {
  const format = useFormatter();
  return <>{formatKzt(format, price)}</>;
}
