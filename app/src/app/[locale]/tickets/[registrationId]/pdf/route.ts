import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFormatter, getTranslations } from "next-intl/server";
import { formatTicketShortCode, kitScanSecret, kitScanToken } from "@/lib/ticketCode";
import { ticketPaymentSummary } from "@/lib/paymentAmount";
import { buildTicketPdf, ticketPdfHeaders, type TicketPdfField } from "@/lib/ticketPdf";
import {
  extraParticipantsOf,
  getTicketRegistration,
  isTicketReady,
  resolveTicketBib,
  ticketTransferPaidSeparately,
} from "@/lib/ticket";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ locale: string; registrationId: string }> },
) {
  const { locale, registrationId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL(`/${locale}/login?callbackUrl=/tickets/${registrationId}`, req.url));
  }

  const [t, format, reg] = await Promise.all([
    getTranslations({ locale, namespace: "Ticket" }),
    getFormatter({ locale }),
    getTicketRegistration(registrationId),
  ]);

  if (!reg || reg.userId !== session.user.id) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!isTicketReady(reg)) {
    return NextResponse.redirect(new URL(`/${locale}/pay/${registrationId}`, req.url));
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
  const shortCode = formatTicketShortCode(reg.id);
  const dateStr = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(reg.event.dateISO);
  const perSlot = reg.distance?.participantsPerSlot ?? 1;
  const extras = extraParticipantsOf(reg);

  const fields: TicketPdfField[] = [];
  if (hasPaidSlot) {
    const bibValue =
      bibNumber != null && perSlot > 1
        ? Array.from({ length: perSlot }, (_, i) => `№${bibNumber}-${i + 1}`).join("  ")
        : bibNumber != null
          ? `№${bibNumber}`
          : "—";
    fields.push({ label: t("fieldBib"), value: bibValue, accent: true });
  }
  fields.push(
    { label: t("fieldName"), value: `${reg.user.firstName} ${reg.user.lastName}` },
    { label: t("fieldDistance"), value: distanceLabel },
    { label: t("fieldPayment"), value: amountLabel, hint: paymentKindLabel },
    { label: t("fieldDate"), value: dateStr },
    { label: t("fieldLocation"), value: reg.event.location, span2: hasPaidSlot },
  );

  const bytes = await buildTicketPdf({
    eyebrow: reg.isTransferOnly ? t("paymentKindTransfer") : t("eyebrow"),
    title: `${reg.event.race.name} ${reg.event.year}`,
    headerColor: reg.isTransferOnly ? "spruce" : "ember",
    qrPayload: (() => {
      const secret = kitScanSecret();
      return secret ? kitScanToken(registrationId, secret) : "ticket";
    })(),
    qrHint: reg.isTransferOnly ? t("qrHintTransfer") : t("qrHint"),
    shortCodeLabel: t("shortCodeLabel"),
    shortCode,
    shortCodeHint: reg.isTransferOnly ? undefined : t("shortCodeHint"),
    fields,
    extraTitle: extras.length > 0 ? t("extraParticipants") : undefined,
    extras: extras.map((p, i) => ({
      name: `${p.firstName} ${p.lastName}`,
      bib: bibNumber != null ? `№${bibNumber}-${i + 2}` : undefined,
    })),
    footer: t("footer", { id: reg.id.slice(-8).toUpperCase() }),
  });

  const filename = `ticket-${reg.event.race.slug}-${reg.event.year}-${shortCode}.pdf`;
  return new NextResponse(Buffer.from(bytes), { headers: ticketPdfHeaders(filename) });
}
