"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { getRegistrationForPayment } from "@/lib/queries";
import type { PaymentInvoiceView } from "@/lib/apipay";
import { formatKzt } from "@/lib/currency";
import { registrationPaymentAmount } from "@/lib/paymentAmount";
import { simulatePaymentAction, cancelReservationAction, refreshKaspiQrAction } from "./actions";

type Registration = NonNullable<Awaited<ReturnType<typeof getRegistrationForPayment>>>;

export function PaymentView({
  registration,
  testMode,
  locale,
  invoice,
}: {
  registration: Registration;
  testMode: boolean;
  locale: string;
  invoice: PaymentInvoiceView | null;
}) {
  const t = useTranslations("Payment");
  const format = useFormatter();
  const router = useRouter();
  const [qrExpired, setQrExpired] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (registration.status !== "RESERVED") return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/pay/${registration.id}/status`);
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string; expired?: boolean };
        if (data.status === "PAID") {
          router.refresh();
          return;
        }
        if (data.expired) setQrExpired(true);
      } catch {
        /* keep waiting */
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [registration.id, registration.status, router]);

  useEffect(() => {
    if (!invoice?.expiresAt) return;
    setQrExpired(new Date(invoice.expiresAt).getTime() <= Date.now());
  }, [invoice?.expiresAt]);

  if (registration.status === "PAID") {
    if (registration.isTransferOnly) {
      return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-4 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-spruce/10 text-3xl">✓</div>
          <h1 className="font-display text-2xl font-bold text-ink">Трансфер оплачен!</h1>
          <p className="text-ink-soft">
            Трансфер добавлен к вашей регистрации на{" "}
            <span className="font-semibold">
              {registration.event.race.name} {registration.event.year}
            </span>
            . QR-код для посадки — в вашем билете.
          </p>
          <div className="mt-2 flex gap-3">
            <Link
              href={`/tickets/${registration.id}`}
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

  const total = registrationPaymentAmount(registration);
  const paymentUrl = invoice?.paymentUrl ?? registration.kaspiPaymentUrl;
  const qrImageUrl = invoice?.qrImageUrl ?? registration.kaspiQrImageUrl;
  const expiresAt = invoice?.expiresAt ?? registration.kaspiQrExpiresAt?.toISOString() ?? null;

  async function handleRefreshQr() {
    setRefreshing(true);
    try {
      await refreshKaspiQrAction(locale, registration.id);
      setQrExpired(false);
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <div>
        <span className="text-xs font-bold uppercase tracking-wide text-ember">{t("eyebrow")}</span>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink">
          {registration.event.race.name} {registration.event.year} · {registration.distance?.name ?? "Трансфер"}
        </h1>
        {registration.isTransferOnly ? (
          <p className="mt-2 text-2xl font-bold text-ink">
            {formatKzt(format, registration.event.transferPrice ?? 0)}
          </p>
        ) : (() => {
          const slotPrice = registration.distance?.price ?? 0;
          const discount = registration.discountAmount ?? 0;
          const transferAmt = registration.includesTransfer ? (registration.event.transferPrice ?? 0) : 0;
          const showBreakdown = discount > 0 || transferAmt > 0;
          return (
            <div className="mt-2 flex flex-col gap-1">
              {showBreakdown ? (
                <>
                  <div className="flex flex-col gap-0.5 text-sm text-ink-soft">
                    <div className="flex justify-between">
                      <span>Слот</span>
                      <span className="tabular-nums">{formatKzt(format, slotPrice)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-spruce">
                        <span>Промокод</span>
                        <span className="tabular-nums">−{formatKzt(format, discount)}</span>
                      </div>
                    )}
                    {transferAmt > 0 && (
                      <div className="flex justify-between">
                        <span>Трансфер</span>
                        <span className="tabular-nums">+{formatKzt(format, transferAmt)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-ink">{formatKzt(format, total)}</p>
                </>
              ) : (
                <p className="text-2xl font-bold text-ink">{formatKzt(format, total)}</p>
              )}
            </div>
          );
        })()}
      </div>

      {invoice?.error && (
        <p className="rounded-[var(--radius-m)] border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger">
          {t("invoiceError", { error: invoice.error })}
        </p>
      )}

      {(paymentUrl || qrImageUrl) && !qrExpired ? (
        <div className="flex flex-col items-center gap-4 rounded-[var(--radius-m)] border border-border bg-surface p-5">
          <p className="text-center text-sm text-ink-soft">{t("qrHint")}</p>
          {qrImageUrl && (
            <img src={qrImageUrl} alt="" width={240} height={240} className="h-60 w-60 rounded-[var(--radius-s)] bg-white p-2" />
          )}
          {paymentUrl && (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-[var(--radius-s)] bg-ember px-5 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-ember-strong"
            >
              {t("payInKaspiCta")}
            </a>
          )}
          {expiresAt && (
            <p className="text-xs text-ink-faint">
              {t("qrExpires", { time: format.dateTime(new Date(expiresAt), { timeStyle: "short" }) })}
            </p>
          )}
          <p className="text-xs text-ink-faint">{t("waiting")}</p>
        </div>
      ) : qrExpired || invoice?.error ? (
        <button
          type="button"
          onClick={handleRefreshQr}
          disabled={refreshing}
          className="w-full rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong disabled:opacity-60"
        >
          {refreshing ? t("waiting") : t("refreshQrCta")}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4 text-sm text-ink-faint">
            {t("optionApp")}
          </div>
          <div className="rounded-[var(--radius-m)] border border-border bg-surface-2 px-5 py-4 text-sm text-ink-faint">
            {t("optionQr")}
          </div>
        </div>
      )}

      {qrExpired && (paymentUrl || qrImageUrl) && (
        <p className="text-center text-sm text-ink-soft">{t("qrExpired")}</p>
      )}

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
