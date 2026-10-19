import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getUserProfile } from "@/lib/queries";
import { compareInvoiceDesc, expandRegistrationPayments } from "@/lib/invoiceDisplay";
import { displayRegistrationStatus, visibleAccountRefunds } from "@/lib/registrationStatus";
import { CancelRegistrationButton } from "./CancelRegistrationButton";
import { RefundRequestButton } from "./RefundRequestButton";

type RegistrationRow = NonNullable<Awaited<ReturnType<typeof getUserProfile>>>["registrations"][number];

export function RegistrationHistory({ registrations }: { registrations: RegistrationRow[] }) {
  const t = useTranslations("Account");
  const tCommon = useTranslations("Common");
  const tStatus = useTranslations("RegistrationStatus");
  const tCert = useTranslations("Certificate");
  const format = useFormatter();

  if (registrations.length === 0) {
    return (
      <p className="rounded-[var(--radius-m)] border border-dashed border-border p-6 text-center text-sm text-ink-faint">
        {t("historyEmpty")}
      </p>
    );
  }

  const rows = registrations
    .flatMap((reg) => expandRegistrationPayments(reg).map((payment) => ({ reg, payment })))
    .sort((a, b) => compareInvoiceDesc(a.payment.invoiceId, b.payment.invoiceId));

  return (
    <ul className="flex flex-col gap-3">
      {rows.map(({ reg, payment }) => {
        const statusLabel =
          !payment.isCurrent
            ? tStatus(payment.paymentStatus === "paid" ? "PAID" : payment.paymentStatus === "reserved" ? "RESERVED" : "CANCELLED")
            : tStatus(displayRegistrationStatus(reg.status, reg.refundRequests, {
                invoiceId: payment.invoiceId ?? reg.kaspiOrderId,
                reregistrationCount: reg.reregistrationCount,
              }));
        return (
        <li
          key={`${reg.id}-${payment.invoiceId ?? "none"}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-m)] border border-border bg-surface p-4"
        >
          <div>
            <Link href={`/events/${reg.event.race.slug}/${reg.event.year}`} className="font-semibold text-ink hover:text-ember">
              {reg.event.race.name} {reg.event.year}
            </Link>
            <p className="mt-0.5 text-sm text-ink-soft">
              {reg.distance
                ? `${reg.distance.name}${reg.distance.km > 0 ? ` · ${reg.distance.km} ${tCommon("km")}` : ""}`
                : reg.isTransferOnly
                  ? "Трансфер"
                  : "—"}
              {payment.isCurrent && reg.bibNumber && ` · №${reg.bibNumber}`}
            </p>
            {payment.invoiceId && (
              <p className="mt-0.5 text-xs tabular-nums text-ink-faint">
                {t("invoiceNumber")} {payment.invoiceId}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">
              {statusLabel}
            </span>
            <span className="text-xs text-ink-faint">
              {payment.paidAt
                ? format.dateTime(payment.paidAt, { day: "numeric", month: "short", year: "numeric" })
                : payment.invoiceId
                  ? "—"
                  : format.dateTime(reg.createdAt, { day: "numeric", month: "short", year: "numeric" })}
            </span>
            {payment.isCurrent && (reg.status === "PAID" || (reg.status === "RESERVED" && reg.event.race.isMass)) && (
              <Link href={`/tickets/${reg.id}`} className="text-xs font-semibold text-ember hover:underline">
                {t("showQrCta")}
              </Link>
            )}
            {payment.isCurrent && reg.result && (
              <Link href={`/certificate/${reg.result.id}`} className="text-xs font-semibold text-spruce hover:underline">
                🏅 {tCert("downloadCta")}
              </Link>
            )}
            {payment.isCurrent &&
              reg.status === "RESERVED" &&
              !reg.kitPickedUpAt &&
              new Date() <= new Date(reg.event.cancellationDeadline) && (
                <CancelRegistrationButton registrationId={reg.id} />
              )}
            {payment.isCurrent && refundControls(reg)}
          </div>
        </li>
        );
      })}
    </ul>
  );
}

function refundControls(reg: RegistrationRow) {
  const hasTransfer = reg.includesTransfer || reg.isTransferOnly;
  const hasSlot = !reg.isTransferOnly && !!reg.distance;
  const slotAmount = Math.max(0, (reg.distance?.price ?? 0) - (reg.discountAmount ?? 0));
  const transferAmount = Math.max(0, reg.event.transferPrice ?? 0);
  const canRequest =
    reg.status === "PAID" &&
    new Date() <= new Date(reg.event.cancellationDeadline) &&
    !reg.transferUsedAt &&
    !(reg.kitPickedUpAt && !hasTransfer);
  const currentRequests = visibleAccountRefunds(reg.refundRequests, {
    registrationStatus: reg.status,
    hasTransfer,
    hasSlot,
  });
  if (!canRequest && currentRequests.length === 0) return null;
  return (
    <RefundRequestButton
      registrationId={reg.id}
      hasTransfer={hasTransfer}
      hasSlot={hasSlot}
      slotAmount={slotAmount}
      transferAmount={transferAmount}
      registrationStatus={reg.status}
      requests={reg.refundRequests.map((r) => ({
        type: r.type,
        status: r.status,
        requestedAt: r.requestedAt,
        resolvedAt: r.resolvedAt,
        amount: r.amount ?? (r.type === "TRANSFER" ? transferAmount : slotAmount),
        invoiceId: r.invoiceId ?? reg.kaspiOrderId,
      }))}
      slotLocked={!!reg.kitPickedUpAt}
      canRequest={canRequest}
      invoiceId={reg.kaspiOrderId}
    />
  );
}
