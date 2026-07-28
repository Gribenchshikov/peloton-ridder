import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { getRegistrationForPayment } from "@/lib/queries";
import { formatKzt } from "@/lib/currency";
import { simulatePaymentAction, cancelReservationAction } from "./actions";

type Registration = NonNullable<Awaited<ReturnType<typeof getRegistrationForPayment>>>;

export function PaymentView({
  registration,
  testMode,
  locale,
}: {
  registration: Registration;
  testMode: boolean;
  locale: string;
}) {
  const t = useTranslations("Payment");
  const format = useFormatter();

  if (registration.status === "PAID") {
    // Transfer-only payment — send user back to their event registration page
    // where the slot ticket (with transfer badge) is shown.
    if (registration.isTransferOnly) {
      const slug = registration.event.race.slug;
      const year = registration.event.year;
      return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-4 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-spruce/10 text-3xl">✓</div>
          <h1 className="font-display text-2xl font-bold text-ink">Трансфер оплачен!</h1>
          <p className="text-ink-soft">
            Трансфер добавлен к вашей регистрации на{" "}
            <span className="font-semibold">{registration.event.race.name} {year}</span>.
            QR-код для посадки — в вашем билете.
          </p>
          <div className="mt-2 flex gap-3">
            <Link
              href={`/events/${slug}/${year}/register`}
              className="rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
            >
              Открыть билет
            </Link>
            <Link
              href="/account"
              className="rounded-[var(--radius-s)] border border-border px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
            >
              {t("toAccountCta")}
            </Link>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-4 px-6 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-ink">{t("paidTitle")}</h1>
        <p className="text-ink-soft">{t("paidText", { bib: registration.bibNumber ?? "—" })}</p>
        <div className="mt-2 flex gap-3">
          <Link
            href={`/tickets/${registration.id}`}
            className="rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
          >
            {t("viewTicketCta")}
          </Link>
          <Link
            href="/account"
            className="rounded-[var(--radius-s)] border border-border px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("toAccountCta")}
          </Link>
        </div>
      </main>
    );
  }

  if (registration.status === "CANCELLED") {
    return <StatusMessage title={t("cancelledTitle")} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("eyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">
          {registration.event.race.name} {registration.event.year} · {registration.distance?.name ?? "Трансфер"}
        </h1>
        <p className="mt-2 text-2xl font-bold text-ink">
          {formatKzt(format,
            registration.isTransferOnly
              ? (registration.event.transferPrice ?? 0)
              : (
                  (registration.distance?.price ?? 0)
                  - (registration.discountAmount ?? 0)
                  + (registration.includesTransfer ? (registration.event.transferPrice ?? 0) : 0)
                )
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4 text-sm text-ink-faint">
          {t("optionApp")}
        </div>
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4 text-sm text-ink-faint">
          {t("optionQr")}
        </div>
        <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4 text-sm text-ink-faint">
          {t("optionManual")}
        </div>
      </div>

      <form action={cancelReservationAction.bind(null, locale, registration.id)}>
        <button
          type="submit"
          className="w-full rounded-[var(--radius-s)] border border-border px-5 py-3 text-sm font-semibold text-ink-soft transition-colors hover:border-danger hover:text-danger"
        >
          {t("cancelReservationCta")}
        </button>
      </form>

      {testMode && (
        <div className="rounded-[var(--radius-m)] border border-dashed border-warn bg-warn-tint p-5">
          <p className="text-sm font-semibold text-warn">{t("testModeTitle")}</p>
          <p className="mt-1 text-sm text-ink-soft">{t("testModeText")}</p>
          <form action={simulatePaymentAction.bind(null, locale, registration.id)} className="mt-4">
            <button
              type="submit"
              className="w-full rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
            >
              {t("simulateCta")}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}

function StatusMessage({ title, text }: { title: string; text?: string }) {
  const t = useTranslations("Payment");
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-4 px-6 py-20 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      {text && <p className="text-ink-soft">{text}</p>}
      <Link
        href="/account"
        className="mt-2 rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
      >
        {t("toAccountCta")}
      </Link>
    </main>
  );
}
