import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getPathname, redirect } from "@/i18n/navigation";
import { getTranslations, getFormatter } from "next-intl/server";
import QRCode from "qrcode";
import { formatTicketShortCode } from "@/lib/ticketCode";
import { ticketPaymentSummary } from "@/lib/paymentAmount";
import {
  extraParticipantsOf,
  getTicketRegistration,
  isTicketReady,
  resolveTicketBib,
  ticketTransferPaidSeparately,
} from "@/lib/ticket";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ locale: string; registrationId: string }>;
}) {
  const { locale, registrationId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: { pathname: "/login", query: { callbackUrl: `/tickets/${registrationId}` } }, locale });
  }

  const [t, format, reg] = await Promise.all([
    getTranslations("Ticket"),
    getFormatter({ locale }),
    getTicketRegistration(registrationId),
  ]);

  if (!reg || reg.userId !== session.user.id) notFound();
  if (!isTicketReady(reg)) {
    return redirect({ href: `/pay/${registrationId}`, locale });
  }

  const transferPaidSeparately = await ticketTransferPaidSeparately(
    session.user.id,
    reg.eventId,
    reg.isTransferOnly,
  );

  const payment = ticketPaymentSummary(reg, { transferPaidSeparately });
  const paymentKindLabel =
    payment.kind === "transfer"
      ? t("paymentKindTransfer")
      : payment.kind === "slotAndTransfer"
        ? t("paymentKindSlotAndTransfer")
        : t("paymentKindSlot");
  const amountLabel = format.number(payment.amount, {
    style: "currency",
    currency: "KZT",
    maximumFractionDigits: 0,
  });

  const hasPaidSlot = !reg.isTransferOnly;
  const bibNumber = await resolveTicketBib(reg);
  const distanceLabel = hasPaidSlot
    ? `${reg.distance?.name ?? "—"}${reg.distance?.km ? ` · ${reg.distance.km} km` : ""}`
    : t("distanceTransfer");

  const qrData = `RIDDER:${registrationId}`;
  const qrDataUrl = await QRCode.toDataURL(qrData, { width: 240, margin: 1 });
  const shortCode = formatTicketShortCode(reg.id);
  const dateStr = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(reg.event.dateISO);
  const headerClass = reg.isTransferOnly ? "bg-spruce" : "bg-ember";
  const perSlot = reg.distance?.participantsPerSlot ?? 1;
  const extras = extraParticipantsOf(reg);
  const pdfHref = getPathname({ href: `/tickets/${registrationId}/pdf`, locale });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-6 py-16">
      <div className="w-full overflow-hidden rounded-[var(--radius-l)] border border-border bg-surface shadow-sm">
        <div className={`${headerClass} px-6 py-5 text-white`}>
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">
            {reg.isTransferOnly ? t("paymentKindTransfer") : t("eyebrow")}
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">
            {reg.event.race.name} {reg.event.year}
          </h1>
        </div>

        <div className="flex flex-col items-center gap-3 border-b border-border px-6 py-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={reg.isTransferOnly ? "QR-код трансфера" : "QR-код билета"}
            className="h-48 w-48"
          />
          <p className="text-xs text-ink-faint">{reg.isTransferOnly ? t("qrHintTransfer") : t("qrHint")}</p>
          <div className="mt-1 flex flex-col items-center gap-0.5">
            <span className="text-[0.68rem] font-bold uppercase tracking-wide text-ink-faint">{t("shortCodeLabel")}</span>
            <span className="font-mono text-2xl font-extrabold tracking-widest text-ink">{shortCode}</span>
            {!reg.isTransferOnly && (
              <span className="text-[0.65rem] text-ink-faint">{t("shortCodeHint")}</span>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-6">
          {hasPaidSlot && (
            <div>
              <dt className="text-xs text-ink-faint">{t("fieldBib")}</dt>
              {bibNumber != null && perSlot > 1 ? (
                <dd className="mt-0.5 flex flex-wrap gap-1">
                  {Array.from({ length: perSlot }, (_, i) => (
                    <span key={i} className="font-display text-2xl font-extrabold text-ember">
                      №{bibNumber}-{i + 1}
                    </span>
                  ))}
                </dd>
              ) : (
                <dd className="mt-0.5 font-display text-3xl font-extrabold text-ember">
                  {bibNumber != null ? `№${bibNumber}` : "—"}
                </dd>
              )}
            </div>
          )}
          <div>
            <dt className="text-xs text-ink-faint">{t("fieldName")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">
              {reg.user.firstName} {reg.user.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">{t("fieldDistance")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{distanceLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">{t("fieldPayment")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{amountLabel}</dd>
            <dd className="text-xs text-ink-soft">{paymentKindLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">{t("fieldDate")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{dateStr}</dd>
          </div>
          <div className={hasPaidSlot ? "col-span-2" : undefined}>
            <dt className="text-xs text-ink-faint">{t("fieldLocation")}</dt>
            <dd className="mt-0.5 font-semibold text-ink">{reg.event.location}</dd>
          </div>
        </dl>

        {hasPaidSlot && extras.length > 0 && (
          <div className="border-t border-border px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-faint">{t("extraParticipants")}</p>
            <ul className="mt-2 flex flex-col gap-1.5">
              {extras.map((p, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">
                    {p.firstName} {p.lastName}
                  </span>
                  {bibNumber != null && <span className="font-mono text-ink-faint">№{bibNumber}-{i + 2}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-border px-6 py-4 text-center text-xs text-ink-faint">
          {t("footer", { id: reg.id.slice(-8).toUpperCase() })}
        </div>
      </div>

      <a
        href={pdfHref}
        className="mt-6 flex w-full items-center justify-center rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong print:hidden"
      >
        {t("downloadCta")}
      </a>
    </main>
  );
}
