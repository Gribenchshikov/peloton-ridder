"use server";

import { NextResponse } from "next/server";
import { requireOperatorOrAdminId } from "@/lib/session";
import { getEventWithRegistrationsBySlug } from "@/lib/queries";
import { csvDownloadHeaders, csvWindows1251Bytes, toCsv } from "@/lib/csv";
import { collectPaidInvoices } from "@/lib/invoiceDisplay";
import { displayRegistrationStatus, hasConfirmedTransferRefund } from "@/lib/registrationStatus";
import { slotRefundAmount } from "@/lib/paymentAmount";

type InvoiceRegistration = {
  status: string;
  kaspiOrderId: string | null;
  paidInvoiceIds: string[];
  refundRequests?: { type: string; status: string; invoiceId: string | null }[];
  includesTransfer: boolean;
  isTransferOnly: boolean;
};

function currentPaidInvoiceId(reg: InvoiceRegistration): string {
  return collectPaidInvoices(reg).find((invoice) => invoice.status === "paid")?.id ?? "";
}

/** Оплаченный или возвращённый трансфер. Неоплаченная бронь в выгрузку не попадает. */
function transferCsvPayment(reg: InvoiceRegistration): "Оплачено" | "Возврат" | null {
  if (reg.status === "PAID" && (reg.includesTransfer || reg.isTransferOnly)) return "Оплачено";
  if (hasConfirmedTransferRefund(reg.refundRequests)) return "Возврат";
  if (reg.isTransferOnly && reg.status === "CANCELLED" && collectPaidInvoices(reg).length > 0) return "Возврат";
  return null;
}

function transferCsvInvoiceId(reg: InvoiceRegistration, payment: "Оплачено" | "Возврат"): string {
  if (payment === "Оплачено") return currentPaidInvoiceId(reg);
  const refunded = reg.refundRequests?.find(
    (request) => request.type === "TRANSFER" && request.status === "CONFIRMED" && request.invoiceId,
  );
  return refunded?.invoiceId ?? collectPaidInvoices(reg).at(-1)?.id ?? "";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ locale: string; slug: string; year: string }> },
) {
  const { slug, year } = await params;

  const adminId = await requireOperatorOrAdminId();
  if (!adminId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const event = await getEventWithRegistrationsBySlug(slug, yearNum);
  if (!event) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const typeParam = url.searchParams.get("type"); // transfer | kit | (default: full)
  const statusParam = url.searchParams.get("status");
  const distanceParam = url.searchParams.get("distanceId");
  const transferParam = url.searchParams.get("transfer");

  // ── Kit pickup CSV ──────────────────────────────────────────────────────────
  if (typeParam === "kit") {
    const paid = event.registrations.filter((r) => r.status === "PAID" && !r.isTransferOnly);
    paid.sort((a, b) => (a.user.lastName ?? "").localeCompare(b.user.lastName ?? "", "ru"));

    const rows = [
      ["Оплата", "Фамилия", "Имя", "Рег. номер", "Экстренный контакт", "Дата рождения", "Стартовый набор", "Номер счёта"],
      ...paid.map((r) => [
        "✓",
        r.user.lastName,
        r.user.firstName,
        r.bibNumber ?? "",
        r.emergencyContact ?? "",
        r.user.birthDate ? new Date(r.user.birthDate).toLocaleDateString("ru-RU") : "",
        r.kitPickedUpAt ? "Да" : "Нет",
        currentPaidInvoiceId(r),
      ]),
    ];
    const csv = toCsv(rows);
    return new NextResponse(Buffer.from(csvWindows1251Bytes(csv)), {
      headers: csvDownloadHeaders(`kit-${slug}-${year}.csv`),
    });
  }

  // ── Transfer CSV ────────────────────────────────────────────────────────────
  if (typeParam === "transfer") {
    const withTransfer = event.registrations.flatMap((r) => {
      const payment = transferCsvPayment(r);
      return payment ? [{ reg: r, payment }] : [];
    });
    withTransfer.sort((a, b) => (a.reg.user.lastName ?? "").localeCompare(b.reg.user.lastName ?? "", "ru"));

    const rows = [
      ["Рег. номер", "Фамилия", "Имя", "Телефон", "Посадка", "Оплата", "Номер счёта"],
      ...withTransfer.map(({ reg, payment }) => [
        reg.bibNumber ?? "",
        reg.user.lastName,
        reg.user.firstName,
        reg.user.phone ?? "",
        reg.transferUsedAt ? "Да" : "Нет",
        payment,
        transferCsvInvoiceId(reg, payment),
      ]),
    ];
    const csv = toCsv(rows);
    return new NextResponse(Buffer.from(csvWindows1251Bytes(csv)), {
      headers: csvDownloadHeaders(`transfer-${slug}-${year}.csv`),
    });
  }

  const registrations = event.registrations.filter((r) => {
    const statusDisplay = displayRegistrationStatus(r.status, r.refundRequests, {
      invoiceId: r.kaspiOrderId,
      reregistrationCount: r.reregistrationCount,
    });
    if (r.isTransferOnly && statusDisplay !== "REFUNDED") return false;
    if (statusParam) {
      if (statusDisplay !== statusParam) return false;
    } else if (r.status !== "PAID") {
      return false;
    }
    if (distanceParam && r.distance?.id !== distanceParam && r.distanceId !== distanceParam) return false;
    if (transferParam === "yes" && !r.includesTransfer) return false;
    if (transferParam === "no" && r.includesTransfer) return false;
    return true;
  });

  const rows = [
    [
      "Регистрационный номер",
      "Имя",
      "Фамилия",
      "Email",
      "Телефон",
      "Дистанция",
      "Км",
      "Статус",
      "Сумма оплаты",
      "Промокод",
      "Скидка (тг)",
      "Беговой клуб",
      "Дата регистрации",
      "Причина отмены",
      "Комментарий отмены",
    ],
    ...registrations.map((r) => {
      const statusDisplay = displayRegistrationStatus(r.status, r.refundRequests, {
        invoiceId: r.kaspiOrderId,
        reregistrationCount: r.reregistrationCount,
      });
      const cancelLabels: Record<string, string> = {
        INJURY: "Травма / болезнь",
        CANT_ATTEND: "Не смогу приехать",
        FINANCIAL: "Финансовые причины",
        FAMILY: "Семейные обстоятельства",
        CONFLICT: "Другое мероприятие",
        NOT_READY: "Не готов физически",
        DEFER: "Перенесу на след. год",
        OTHER: "Другое",
      };
      const paidAmount = slotRefundAmount({
        isTransferOnly: r.isTransferOnly,
        discountAmount: r.discountAmount,
        includesTransfer: r.includesTransfer,
        distance: r.distance,
        event: { transferPrice: event.transferPrice },
      });
      return [
        r.bibNumber ?? "",
        r.user.firstName ?? "",
        r.user.lastName ?? "",
        r.user.email,
        r.user.phone ?? "",
        r.distance?.name ?? (r.isTransferOnly ? "Только трансфер" : ""),
        r.distance?.km ?? "",
        statusDisplay === "PAID"
          ? "Оплачено"
          : statusDisplay === "REFUNDED"
            ? "Возврат"
            : r.status === "CANCELLED"
              ? "Отменено"
              : "Бронь",
        paidAmount,
        r.promoCode?.code ?? "",
        r.discountAmount ?? 0,
        r.runningClub?.name ?? "",
        new Date(r.createdAt).toLocaleDateString("ru-RU"),
        r.cancelReason ? (cancelLabels[r.cancelReason] ?? r.cancelReason) : "",
        r.cancelComment ?? "",
      ];
    }),
  ];

  const csv = toCsv(rows);
  return new NextResponse(Buffer.from(csvWindows1251Bytes(csv)), {
    headers: csvDownloadHeaders(`participants-${slug}-${year}.csv`),
  });
}
