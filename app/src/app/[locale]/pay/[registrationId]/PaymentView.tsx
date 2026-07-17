import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { getRegistrationForPayment } from "@/lib/queries";
import { formatKzt } from "@/lib/currency";
import { simulatePaymentAction } from "./actions";

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
    return (
      <StatusMessage title={t("paidTitle")} text={t("paidText", { bib: registration.bibNumber ?? "—" })} />
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
          {registration.event.race.name} {registration.event.year} · {registration.distance.name}
        </h1>
        <p className="mt-2 text-2xl font-bold text-ink">
          {formatKzt(format, registration.distance.price)}
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
