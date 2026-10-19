import { prisma } from "@/lib/prisma";
import {
  findPaidInvoiceForOrder,
  invoiceAvailableForRefund,
  invoiceRefundRows,
  isApipayConfigured,
  listInvoiceRefunds,
  refundIdOf,
  refundInvoice,
} from "@/lib/apipay";
import { ensurePaidBibNumber, reassignPaidBibNumbers } from "@/lib/bibNumbers";
import {
  refundRequestAmount,
  registrationPaymentAmount,
  type PayableRegistration,
} from "@/lib/paymentAmount";
import { notifyFromRegistration } from "@/lib/userMessages";
import { refundMatchesCurrentInvoice } from "@/lib/registrationStatus";

export const CLEARED_PAYMENT_FIELDS = {
  kaspiOrderId: null,
  kaspiPaymentUrl: null,
  kaspiQrImageUrl: null,
  kaspiQrExpiresAt: null,
};

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0] | typeof prisma;

export async function applySlotRefundToRegistration(
  db: DbClient,
  registrationId: string,
  _options?: { keepTransfer?: boolean },
) {
  void _options;
  const registration = await db.registration.findUnique({
    where: { id: registrationId },
    select: { isTransferOnly: true, distanceId: true },
  });
  if (!registration) return;

  // Слот снимаем, но строку оставляем в списке участников (кроме чистого трансфера).
  await db.registration.update({
    where: { id: registrationId },
    data: {
      status: "CANCELLED",
      reservedUntil: null,
      bibNumber: null,
      ...(registration.distanceId || !registration.isTransferOnly ? { isTransferOnly: false } : {}),
    },
  });
}

/** Сбрасывает зависший PAID после подтверждённого возврата слота по текущему счёту. */
export async function repairStalePaidSlotRefunds(eventId: string) {
  const candidates = await prisma.registration.findMany({
    where: {
      eventId,
      status: "PAID",
      refundRequests: { some: { type: "SLOT", status: "CONFIRMED" } },
    },
    select: {
      id: true,
      distanceId: true,
      kaspiOrderId: true,
      reregistrationCount: true,
      refundRequests: { select: { type: true, status: true, invoiceId: true } },
    },
  });
  if (candidates.length === 0) return 0;

  const staleIds = candidates
    .filter((row) =>
      row.refundRequests.some(
        (request) =>
          request.type === "SLOT" &&
          request.status === "CONFIRMED" &&
          refundMatchesCurrentInvoice(request, row.kaspiOrderId, row.reregistrationCount),
      ),
    )
    .map((row) => row.id);
  if (staleIds.length === 0) return 0;

  const stale = candidates.filter((row) => staleIds.includes(row.id));
  await prisma.$transaction(async (tx) => {
    const distanceIds = [...new Set(stale.map((row) => row.distanceId).filter(Boolean))] as string[];
    for (const id of distanceIds.sort()) {
      await tx.$queryRaw`SELECT "id" FROM "Distance" WHERE "id" = ${id} FOR UPDATE`;
    }
    for (const id of staleIds) {
      await applySlotRefundToRegistration(tx, id, { keepTransfer: false });
    }
    await reassignPaidBibNumbers(tx, eventId);
  });
  return staleIds.length;
}

/** Если вернули только трансфер, слот остаётся оплаченным. */
export async function restorePaidSlotAfterTransferRefund(eventId?: string, userId?: string) {
  const rows = await prisma.registration.findMany({
    where: {
      ...(eventId ? { eventId } : {}),
      ...(userId ? { userId } : {}),
      status: "CANCELLED",
      isTransferOnly: false,
      cancelReason: null,
      distanceId: { not: null },
    },
    select: {
      id: true,
      kaspiOrderId: true,
      paidInvoiceIds: true,
      reregistrationCount: true,
      refundRequests: { select: { type: true, status: true, invoiceId: true } },
    },
  });

  const restoreIds = rows.filter((row) => {
    const currentInvoice = row.kaspiOrderId ?? row.paidInvoiceIds.at(-1) ?? null;
    if (!currentInvoice) return false;
    const slotRefunded = row.refundRequests.some(
      (request) =>
        request.type === "SLOT" &&
        request.status === "CONFIRMED" &&
        refundMatchesCurrentInvoice(request, currentInvoice, row.reregistrationCount),
    );
    if (slotRefunded) return false;
    return row.refundRequests.some(
      (request) =>
        request.type === "TRANSFER" &&
        request.status === "CONFIRMED" &&
        refundMatchesCurrentInvoice(request, currentInvoice, row.reregistrationCount),
    );
  }).map((row) => row.id);

  if (restoreIds.length === 0) return 0;

  await prisma.registration.updateMany({
    where: { id: { in: restoreIds } },
    data: { status: "PAID", reservedUntil: null },
  });
  for (const id of restoreIds) {
    await ensurePaidBibNumber(id).catch((error) => {
      console.error("[refund] bib restore failed:", id, error);
    });
  }
  return restoreIds.length;
}

export async function repairUserStalePaidSlotRefunds(userId: string) {
  const rows = await prisma.registration.findMany({
    where: {
      userId,
      status: "PAID",
      isTransferOnly: false,
      reregistrationCount: 0,
      refundRequests: { some: { type: "SLOT", status: "CONFIRMED" } },
    },
    select: { eventId: true },
    distinct: ["eventId"],
  });
  for (const row of rows) {
    await repairStalePaidSlotRefunds(row.eventId);
  }
}

export type PayoutResult = {
  amount: number;
  payoutStatus: "skipped" | "pending" | "processing" | "failed" | "completed";
  apipayRefundId: string | null;
};

const PAYABLE_SELECT = {
  id: true,
  kaspiOrderId: true,
  isTransferOnly: true,
  discountAmount: true,
  includesTransfer: true,
  distance: { select: { price: true } },
  event: { select: { transferPrice: true } },
} as const;

function alreadySentToApipay(row: { payoutStatus: string | null; apipayRefundId: string | null }) {
  return Boolean(refundIdOf(row.apipayRefundId));
}

function payoutStatusFromRefund(status: string | undefined): PayoutResult["payoutStatus"] {
  if (status === "failed") return "failed";
  if (status === "completed") return "completed";
  if (status === "processing") return "processing";
  return "pending";
}

export function apipayAccepted(payout: PayoutResult) {
  return Boolean(
    refundIdOf(payout.apipayRefundId) &&
      (payout.payoutStatus === "pending" ||
        payout.payoutStatus === "processing" ||
        payout.payoutStatus === "completed"),
  );
}

export async function payoutRegistrationRefund(
  registrationId: string,
  type: "SLOT" | "TRANSFER",
  overrideAmount?: number | null,
  refundRequestId?: string,
): Promise<PayoutResult> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: PAYABLE_SELECT,
  });
  if (!registration) {
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }

  const typeAmount = refundRequestAmount(registration as PayableRegistration, type);
  const requested =
    overrideAmount != null && overrideAmount > 0
      ? Math.min(Math.floor(overrideAmount), typeAmount > 0 ? typeAmount : Math.floor(overrideAmount))
      : typeAmount;
  if (requested < 1) {
    console.warn("[apipay] refund skipped: amount is 0", { registrationId, type, refundRequestId: refundRequestId ?? null });
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }

  const current = refundRequestId
    ? await prisma.refundRequest.findUnique({
        where: { id: refundRequestId },
        select: { id: true, reason: true, payoutStatus: true, apipayRefundId: true, invoiceId: true },
      })
    : null;

  if (!isApipayConfigured()) {
    console.warn("[apipay] refund skipped: APIPAY_API_KEY is not set", { registrationId, type });
    return { amount: requested, payoutStatus: "skipped", apipayRefundId: current?.apipayRefundId ?? null };
  }

  const knownInvoiceId = current?.invoiceId || registration.kaspiOrderId;
  const invoice = await findPaidInvoiceForOrder(registration.id, knownInvoiceId);
  if (!invoice) {
    console.warn("[apipay] refund failed: paid invoice not found", {
      registrationId,
      type,
      refundRequestId: refundRequestId ?? null,
      kaspiOrderId: knownInvoiceId,
    });
    return { amount: requested, payoutStatus: "failed", apipayRefundId: null };
  }

  if (registration.kaspiOrderId !== String(invoice.id)) {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { kaspiOrderId: String(invoice.id) },
    });
  }
  if (current && current.invoiceId !== String(invoice.id)) {
    await prisma.refundRequest.update({
      where: { id: current.id },
      data: { invoiceId: String(invoice.id) },
    });
  }

  const storedRefundId = refundIdOf(current?.apipayRefundId);
  if (storedRefundId && current) {
    try {
      const listed = invoiceRefundRows(await listInvoiceRefunds(invoice.id));
      const match = listed.find((row) => refundIdOf(row.id) === storedRefundId);
      if (match) {
        return settlePayout(invoice.id, match, requested);
      }
      console.warn("[apipay] stored refund id is not on current invoice; sending a new refund", {
        registrationId,
        invoiceId: invoice.id,
        refundRequestId: refundRequestId ?? null,
        storedRefundId,
      });
    } catch (error) {
      console.error("[apipay] list refunds failed:", {
        invoiceId: invoice.id,
        refundId: storedRefundId,
        httpStatus: error instanceof Error && "status" in error ? (error as { status?: number }).status : null,
        errorCode: error instanceof Error && "code" in error ? (error as { code?: string }).code : null,
      });
      return settlePayout(
        invoice.id,
        { id: Number(storedRefundId), status: current.payoutStatus ?? "pending" },
        requested,
      );
    }
  }

  const available = invoiceAvailableForRefund(invoice);
  const amount = Math.floor(Number.isFinite(available) ? Math.min(requested, available) : requested);
  if (amount < 1) {
    console.warn("[apipay] refund skipped: nothing left on invoice", {
      registrationId,
      type,
      invoiceId: invoice.id,
      refundRequestId: refundRequestId ?? null,
    });
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }

  try {
    const refund = await refundInvoice(invoice.id, amount, current?.reason ?? undefined);
    return settlePayout(invoice.id, refund, amount);
  } catch (error) {
    console.error("[apipay] refund failed:", {
      registrationId,
      type,
      invoiceId: invoice.id,
      refundRequestId: refundRequestId ?? null,
      httpStatus: error instanceof Error && "status" in error ? (error as { status?: number }).status : null,
      errorCode: error instanceof Error && "code" in error ? (error as { code?: string }).code : null,
    });
    return { amount, payoutStatus: "failed", apipayRefundId: null };
  }
}

async function payoutRemainingInvoice(registrationId: string): Promise<PayoutResult> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: PAYABLE_SELECT,
  });
  if (!registration) {
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }

  const requested = registrationPaymentAmount(registration as PayableRegistration);
  if (requested < 1) {
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }
  if (!isApipayConfigured()) {
    console.warn("[apipay] refund skipped: APIPAY_API_KEY is not set", { registrationId });
    return { amount: requested, payoutStatus: "skipped", apipayRefundId: null };
  }

  const invoice = await findPaidInvoiceForOrder(registration.id, registration.kaspiOrderId);
  if (!invoice) {
    console.warn("[apipay] refund skipped: paid invoice not found", { registrationId });
    return { amount: requested, payoutStatus: "skipped", apipayRefundId: null };
  }
  if (registration.kaspiOrderId !== String(invoice.id)) {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { kaspiOrderId: String(invoice.id) },
    });
  }

  try {
    const refund = await refundInvoice(invoice.id);
    return settlePayout(invoice.id, refund, requested);
  } catch (error) {
    console.error("[apipay] refund failed:", {
      registrationId,
      invoiceId: invoice.id,
      httpStatus: error instanceof Error && "status" in error ? (error as { status?: number }).status : null,
      errorCode: error instanceof Error && "code" in error ? (error as { code?: string }).code : null,
    });
    return { amount: requested, payoutStatus: "failed", apipayRefundId: null };
  }
}

async function settlePayout(
  invoiceId: number | string,
  refund: { id: number; status: string },
  amount: number,
): Promise<PayoutResult> {
  let status = payoutStatusFromRefund(refund.status);
  let apipayRefundId = refundIdOf(refund.id);
  try {
    const listed = await listInvoiceRefunds(invoiceId);
    const rows = invoiceRefundRows(listed);
    const match =
      rows.find((row) => refundIdOf(row.id) === apipayRefundId) ??
      rows.find((row) => {
        const rowAmount = Number.parseFloat(String(row.amount ?? ""));
        return Number.isFinite(rowAmount) && Math.floor(rowAmount) === amount;
      });
    if (match) {
      apipayRefundId = refundIdOf(match.id) ?? apipayRefundId;
      status = payoutStatusFromRefund(match.status);
    }
  } catch (error) {
    console.error("[apipay] list refunds failed:", {
      invoiceId,
      refundId: apipayRefundId,
      httpStatus: error instanceof Error && "status" in error ? (error as { status?: number }).status : null,
      errorCode: error instanceof Error && "code" in error ? (error as { code?: string }).code : null,
    });
  }
  return { amount, payoutStatus: status, apipayRefundId };
}

export function canApplyLocalRefund(payout: PayoutResult) {
  if (apipayAccepted(payout)) return true;
  return payout.payoutStatus === "skipped" && (payout.amount < 1 || !isApipayConfigured());
}

export async function refundPaidRegistrationOnAdminCancel(registrationId: string): Promise<PayoutResult> {
  const registrationMeta = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { kaspiOrderId: true, reregistrationCount: true },
  });
  const invoiceId = registrationMeta?.kaspiOrderId ?? null;
  const reregistrationCount = registrationMeta?.reregistrationCount ?? 0;

  const confirmedSlots = await prisma.refundRequest.findMany({
    where: { registrationId, type: "SLOT", status: "CONFIRMED" },
    orderBy: { resolvedAt: "desc" },
    select: { id: true, amount: true, payoutStatus: true, apipayRefundId: true, invoiceId: true },
  });
  const existingSlot = confirmedSlots.find((row) =>
    refundMatchesCurrentInvoice(row, invoiceId, reregistrationCount),
  );
  const pendingSlots = await prisma.refundRequest.findMany({
    where: { registrationId, type: "SLOT", status: "PENDING" },
    orderBy: { requestedAt: "desc" },
    select: { id: true, invoiceId: true },
  });
  const pendingSlot = pendingSlots.find((row) => refundMatchesCurrentInvoice(row, invoiceId, reregistrationCount));

  let payout: PayoutResult;
  if (existingSlot && alreadySentToApipay(existingSlot)) {
    payout = {
      amount: existingSlot.amount ?? 0,
      payoutStatus: (existingSlot.payoutStatus as PayoutResult["payoutStatus"]) ?? "completed",
      apipayRefundId: existingSlot.apipayRefundId,
    };
  } else {
    payout = await payoutRegistrationRefund(registrationId, "SLOT", undefined, pendingSlot?.id);
  }

  if (!canApplyLocalRefund(payout)) {
    if (pendingSlot) {
      await prisma.refundRequest.update({
        where: { id: pendingSlot.id },
        data: {
          amount: payout.amount,
          apipayRefundId: payout.apipayRefundId,
          payoutStatus: payout.payoutStatus,
        },
      });
    }
    return payout;
  }

  if (pendingSlot) {
    await prisma.refundRequest.update({
      where: { id: pendingSlot.id },
      data: {
        status: "CONFIRMED",
        resolvedAt: new Date(),
        adminNote: "Отмена администратором",
        amount: payout.amount,
        invoiceId: invoiceId ?? pendingSlot.invoiceId,
        apipayRefundId: payout.apipayRefundId,
        payoutStatus: payout.payoutStatus,
      },
    });
  } else if (existingSlot) {
    await prisma.refundRequest.update({
      where: { id: existingSlot.id },
      data: {
        amount: payout.amount,
        invoiceId: invoiceId ?? existingSlot.invoiceId,
        apipayRefundId: payout.apipayRefundId,
        payoutStatus: payout.payoutStatus,
      },
    });
  } else {
    await prisma.refundRequest.create({
      data: {
        registrationId,
        type: "SLOT",
        status: "CONFIRMED",
        reason: "Отмена администратором",
        resolvedAt: new Date(),
        amount: payout.amount,
        invoiceId,
        apipayRefundId: payout.apipayRefundId,
        payoutStatus: payout.payoutStatus,
      },
    });
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { includesTransfer: true, isTransferOnly: true, eventId: true, status: true },
  });
  const keepTransfer = Boolean(registration?.includesTransfer && !registration.isTransferOnly);
  if (registration && registration.status !== "CANCELLED") {
    await prisma.$transaction(async (tx) => {
      await applySlotRefundToRegistration(tx, registrationId);
      await reassignPaidBibNumbers(tx, registration.eventId);
    });
  }
  if (!keepTransfer) {
    await rejectLeftoverPending(registrationId);
  }
  if (payout.amount > 0) {
    await notifyFromRegistration(registrationId, "REFUND_SLOT", { amount: payout.amount });
  }
  return payout;
}

export async function refundTransferByAdmin(registrationId: string): Promise<PayoutResult> {
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      includesTransfer: true,
      isTransferOnly: true,
      eventId: true,
      status: true,
      kaspiOrderId: true,
    },
  });
  if (!registration || (!registration.includesTransfer && !registration.isTransferOnly)) {
    return { amount: 0, payoutStatus: "skipped", apipayRefundId: null };
  }

  const pending = await prisma.refundRequest.findFirst({
    where: { registrationId, type: "TRANSFER", status: "PENDING" },
    orderBy: { requestedAt: "desc" },
    select: { id: true, amount: true, invoiceId: true },
  });
  const payout = await payoutRegistrationRefund(registrationId, "TRANSFER", undefined, pending?.id);
  if (!apipayAccepted(payout)) {
    if (pending) {
      await prisma.refundRequest.update({
        where: { id: pending.id },
        data: { amount: payout.amount || pending.amount, payoutStatus: payout.payoutStatus, apipayRefundId: payout.apipayRefundId },
      });
    }
    return payout;
  }

  const transferData = {
    amount: payout.amount,
    invoiceId: pending?.invoiceId ?? registration.kaspiOrderId,
    apipayRefundId: payout.apipayRefundId,
    payoutStatus: payout.payoutStatus,
    status: "CONFIRMED" as const,
    resolvedAt: new Date(),
    adminNote: "Возврат трансфера администратором",
  };
  if (pending) {
    await prisma.refundRequest.update({ where: { id: pending.id }, data: transferData });
  } else {
    await prisma.refundRequest.create({
      data: {
        registrationId,
        type: "TRANSFER",
        reason: "Возврат трансфера администратором",
        ...transferData,
      },
    });
  }

  await prisma.registration.update({
    where: { id: registrationId },
    data: { includesTransfer: false, transferUsedAt: null },
  });
  if (registration.isTransferOnly) {
    await prisma.$transaction(async (tx) => {
      await applySlotRefundToRegistration(tx, registrationId, { keepTransfer: false });
      await reassignPaidBibNumbers(tx, registration.eventId);
    });
  }

  if (payout.amount > 0) {
    await notifyFromRegistration(registrationId, "REFUND_TRANSFER", { amount: payout.amount });
  }
  return payout;
}

export async function markInvoiceRefunded(
  invoiceId: string,
  refund?: { id?: number | string | null; status?: string | null },
) {
  const refundId = refundIdOf(refund?.id);
  const status = payoutStatusFromRefund(refund?.status ?? undefined);
  if (status === "failed") {
    if (refundId) {
      await prisma.refundRequest.updateMany({
        where: { apipayRefundId: refundId },
        data: { payoutStatus: "failed" },
      });
    }
    console.info("[apipay]", { event: "refund_webhook_failed", invoiceId, refundId });
    return;
  }
  if (status !== "completed") {
    if (refundId) {
      await prisma.refundRequest.updateMany({
        where: { apipayRefundId: refundId },
        data: { payoutStatus: status },
      });
    }
    return;
  }

  if (refundId) {
    const byId = await prisma.refundRequest.updateMany({
      where: { apipayRefundId: refundId },
      data: { payoutStatus: "completed" },
    });
    if (byId.count > 0) {
      await applySlotIfConfirmedSlotRefund(invoiceId, refundId);
      return;
    }
  }

  await prisma.refundRequest.updateMany({
    where: {
      payoutStatus: { in: ["pending", "processing"] },
      registration: { kaspiOrderId: invoiceId },
    },
    data: { payoutStatus: "completed" },
  });
  await applySlotIfConfirmedSlotRefund(invoiceId, refundId);
}

async function applySlotIfConfirmedSlotRefund(invoiceId: string, refundId: string | null) {
  const slot = await prisma.refundRequest.findFirst({
    where: {
      type: "SLOT",
      status: "CONFIRMED",
      ...(refundId
        ? { apipayRefundId: refundId }
        : {
            OR: [
              { invoiceId },
              { invoiceId: null, registration: { kaspiOrderId: invoiceId, reregistrationCount: 0 } },
            ],
          }),
    },
    select: {
      registration: {
        select: { id: true, eventId: true, status: true, includesTransfer: true, isTransferOnly: true },
      },
    },
  });
  const registration = slot?.registration;
  if (!registration) return;
  if (registration.status !== "PAID" && registration.status !== "RESERVED") return;

  await prisma.$transaction(async (tx) => {
    await applySlotRefundToRegistration(tx, registration.id, {
      keepTransfer: registration.includesTransfer,
    });
    await reassignPaidBibNumbers(tx, registration.eventId);
  });
}

async function rejectLeftoverPending(registrationId: string) {
  await prisma.refundRequest.updateMany({
    where: { registrationId, status: "PENDING" },
    data: {
      status: "REJECTED",
      resolvedAt: new Date(),
      adminNote: "Отмена администратором: возврат уже выполнен",
    },
  });
}

function needsApipayRetry(row: { payoutStatus: string | null; apipayRefundId: string | null }) {
  if (alreadySentToApipay(row)) return false;
  if (row.payoutStatus === "processing" || row.payoutStatus === "pending" || row.payoutStatus === "completed") {
    return false;
  }
  return row.payoutStatus == null || row.payoutStatus === "skipped" || row.payoutStatus === "failed";
}

/** Досылает в ApiPay подтверждённые возвраты, которые раньше ушли как skipped/failed. */
export async function retrySkippedRefundPayouts(registrationId?: string) {
  const rows = await prisma.refundRequest.findMany({
    where: {
      status: "CONFIRMED",
      ...(registrationId ? { registrationId } : {}),
    },
    select: {
      id: true,
      type: true,
      registrationId: true,
      amount: true,
      payoutStatus: true,
      apipayRefundId: true,
      invoiceId: true,
      registration: { select: { kaspiOrderId: true, reregistrationCount: true } },
    },
    orderBy: [{ type: "asc" }, { resolvedAt: "asc" }],
  });

  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!needsApipayRetry(row)) continue;
    if (
      !refundMatchesCurrentInvoice(
        row,
        row.registration.kaspiOrderId,
        row.registration.reregistrationCount,
      )
    ) {
      continue;
    }
    latest.set(`${row.registrationId}:${row.type}`, row);
  }
  const pending = [...latest.values()].sort((a, b) => a.type.localeCompare(b.type));
  let sent = 0;
  for (const row of pending) {
    const payout = await payoutRegistrationRefund(row.registrationId, row.type, row.amount, row.id);
    await prisma.refundRequest.update({
      where: { id: row.id },
      data: {
        amount: payout.amount || row.amount,
        apipayRefundId: payout.apipayRefundId,
        payoutStatus: payout.payoutStatus,
      },
    });
    if (apipayAccepted(payout)) {
      sent += 1;
    }
  }
  return sent;
}
