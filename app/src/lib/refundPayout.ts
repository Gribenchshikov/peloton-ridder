import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findPaidInvoiceForOrder,
  getInvoiceRefund,
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
import { currencyAccepted, moneyMatches, verifyRefundMatch } from "@/lib/apipayPayment";
import { notifyWaitlistForDistance } from "@/lib/waitlist";

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
  options?: { keepTransfer?: boolean },
) {
  const registration = await db.registration.findUnique({
    where: { id: registrationId },
    select: { isTransferOnly: true, distanceId: true, includesTransfer: true },
  });
  if (!registration) return;

  const keepTransfer = Boolean(options?.keepTransfer && registration.includesTransfer);
  if (keepTransfer) {
    await db.registration.update({
      where: { id: registrationId },
      data: {
        status: "PAID",
        reservedUntil: null,
        bibNumber: null,
        includesTransfer: true,
        isTransferOnly: true,
      },
    });
    return;
  }

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
      includesTransfer: true,
      isTransferOnly: true,
      kaspiOrderId: true,
      reregistrationCount: true,
      refundRequests: { select: { type: true, status: true, invoiceId: true } },
    },
  });
  if (candidates.length === 0) return 0;

  const stale = candidates.filter(
    (row) =>
      !row.isTransferOnly &&
      row.refundRequests.some(
        (request) =>
          request.type === "SLOT" &&
          request.status === "CONFIRMED" &&
          refundMatchesCurrentInvoice(request, row.kaspiOrderId, row.reregistrationCount),
      ),
  );
  if (stale.length === 0) return 0;

  await prisma.$transaction(async (tx) => {
    const distanceIds = [...new Set(stale.map((row) => row.distanceId).filter(Boolean))] as string[];
    for (const id of distanceIds.sort()) {
      await tx.$queryRaw`SELECT "id" FROM "Distance" WHERE "id" = ${id} FOR UPDATE`;
    }
    for (const row of stale) {
      await applySlotRefundToRegistration(tx, row.id, { keepTransfer: row.includesTransfer });
    }
    await reassignPaidBibNumbers(tx, eventId);
  });
  return stale.length;
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

/** Возврат только слота: трансфер остаётся оплаченным, слот больше не занимает место. */
export async function restorePaidTransferAfterSlotRefund(eventId?: string, userId?: string) {
  const rows = await prisma.registration.findMany({
    where: {
      ...(eventId ? { eventId } : {}),
      ...(userId ? { userId } : {}),
      status: "CANCELLED",
      includesTransfer: true,
      isTransferOnly: false,
      cancelReason: null,
    },
    select: {
      id: true,
      kaspiOrderId: true,
      reregistrationCount: true,
      refundRequests: { select: { type: true, status: true, invoiceId: true } },
    },
  });

  const restoreIds = rows.filter((row) => {
    const slotRefunded = row.refundRequests.some(
      (request) =>
        request.type === "SLOT" &&
        request.status === "CONFIRMED" &&
        refundMatchesCurrentInvoice(request, row.kaspiOrderId, row.reregistrationCount),
    );
    if (!slotRefunded) return false;
    return !row.refundRequests.some(
      (request) =>
        request.type === "TRANSFER" &&
        request.status === "CONFIRMED" &&
        refundMatchesCurrentInvoice(request, row.kaspiOrderId, row.reregistrationCount),
    );
  }).map((row) => row.id);

  if (restoreIds.length === 0) return 0;

  await prisma.registration.updateMany({
    where: { id: { in: restoreIds } },
    data: {
      status: "PAID",
      isTransferOnly: true,
      includesTransfer: true,
      bibNumber: null,
      reservedUntil: null,
    },
  });
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
    const match = rows.find((row) => refundIdOf(row.id) === apipayRefundId);
    if (match && moneyMatches(match.amount, amount) && currencyAccepted(match.currency)) {
      apipayRefundId = refundIdOf(match.id) ?? apipayRefundId;
      status = payoutStatusFromRefund(match.status);
    } else if (match) {
      console.error("[apipay] refund verification mismatch", {
        invoiceId,
        refundId: apipayRefundId,
        expectedAmount: amount,
        providerAmount: match.amount ?? null,
        currency: match.currency ?? null,
      });
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

/** Локальный REFUNDED допустим только после completed у провайдера или для нулевой суммы без ApiPay. */
export function isLocalRefundSettled(payout: PayoutResult) {
  if (payout.payoutStatus === "completed" && Boolean(refundIdOf(payout.apipayRefundId))) return true;
  return payout.payoutStatus === "skipped" && (payout.amount < 1 || !isApipayConfigured());
}

export function canApplyLocalRefund(payout: PayoutResult) {
  return isLocalRefundSettled(payout);
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

  if (!isLocalRefundSettled(payout)) {
    if (pendingSlot) {
      await prisma.refundRequest.update({
        where: { id: pendingSlot.id },
        data: {
          amount: payout.amount,
          apipayRefundId: payout.apipayRefundId,
          payoutStatus: payout.payoutStatus,
          invoiceId: invoiceId ?? pendingSlot.invoiceId,
        },
      });
    } else if (refundIdOf(payout.apipayRefundId)) {
      await prisma.refundRequest.create({
        data: {
          registrationId,
          type: "SLOT",
          status: "PENDING",
          reason: "Отмена администратором",
          amount: payout.amount,
          invoiceId,
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
      await applySlotRefundToRegistration(tx, registrationId, { keepTransfer });
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
  if (!isLocalRefundSettled(payout)) {
    const fresh = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: { kaspiOrderId: true },
    });
    const invoiceId = pending?.invoiceId ?? fresh?.kaspiOrderId ?? registration.kaspiOrderId;
    if (pending) {
      await prisma.refundRequest.update({
        where: { id: pending.id },
        data: {
          amount: payout.amount || pending.amount,
          payoutStatus: payout.payoutStatus,
          apipayRefundId: payout.apipayRefundId,
          invoiceId,
        },
      });
    } else if (refundIdOf(payout.apipayRefundId)) {
      await prisma.refundRequest.create({
        data: {
          registrationId,
          type: "TRANSFER",
          status: "PENDING",
          reason: "Возврат трансфера администратором",
          amount: payout.amount,
          invoiceId,
          apipayRefundId: payout.apipayRefundId,
          payoutStatus: payout.payoutStatus,
        },
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

export async function finalizeMatchedRefund(refundRequestId: string): Promise<
  | { result: "replay" }
  | { result: "rejected" }
  | { result: "applied"; registrationId: string; type: "SLOT" | "TRANSFER"; amount: number; distanceId: string | null }
> {
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "RefundRequest" WHERE "id" = ${refundRequestId} FOR UPDATE`;
    const refund = await tx.refundRequest.findUnique({
      where: { id: refundRequestId },
      include: {
        registration: {
          select: {
            id: true,
            eventId: true,
            distanceId: true,
            status: true,
            includesTransfer: true,
            isTransferOnly: true,
          },
        },
      },
    });
    if (!refund) return { result: "rejected" as const };
    if (refund.payoutStatus === "completed" && refund.status === "CONFIRMED") {
      return { result: "replay" as const };
    }
    if (refund.status !== "PENDING" && refund.status !== "CONFIRMED") {
      return { result: "rejected" as const };
    }
    const claimed = await tx.refundRequest.updateMany({
      where: {
        id: refundRequestId,
        status: { in: ["PENDING", "CONFIRMED"] },
        NOT: { payoutStatus: "completed", status: "CONFIRMED" },
      },
      data: {
        status: "CONFIRMED",
        payoutStatus: "completed",
        resolvedAt: refund.resolvedAt ?? new Date(),
      },
    });
    if (claimed.count !== 1) return { result: "replay" as const };

    if (refund.type === "SLOT") {
      const keepTransfer = refund.registration.includesTransfer && !refund.registration.isTransferOnly;
      await applySlotRefundToRegistration(tx, refund.registration.id, { keepTransfer });
      await reassignPaidBibNumbers(tx, refund.registration.eventId);
    } else {
      await tx.registration.update({
        where: { id: refund.registration.id },
        data: { includesTransfer: false, transferUsedAt: null },
      });
      const remaining = await tx.registration.findUnique({
        where: { id: refund.registration.id },
        select: { isTransferOnly: true, status: true },
      });
      if (remaining?.isTransferOnly && remaining.status !== "CANCELLED") {
        await applySlotRefundToRegistration(tx, refund.registration.id, { keepTransfer: false });
        await reassignPaidBibNumbers(tx, refund.registration.eventId);
      }
    }
    return {
      result: "applied" as const,
      registrationId: refund.registration.id,
      type: refund.type,
      amount: refund.amount ?? 0,
      distanceId: refund.registration.distanceId,
    };
  });

  if (outcome.result === "applied" && outcome.amount > 0) {
    await notifyFromRegistration(
      outcome.registrationId,
      outcome.type === "TRANSFER" ? "REFUND_TRANSFER" : "REFUND_SLOT",
      { amount: outcome.amount },
    );
  }
  if (outcome.result === "applied" && outcome.type === "SLOT" && outcome.distanceId) {
    void notifyWaitlistForDistance(outcome.distanceId);
  }
  return outcome;
}

export function revalidateRefundViews() {
  try {
    after(() => {
      revalidatePath("/[locale]/admin/events/[id]/registrations", "page");
      revalidatePath("/[locale]/admin/registrations/[slug]/[year]", "page");
      revalidatePath("/[locale]/admin/refunds", "page");
      revalidatePath("/[locale]/admin/reports", "page");
      revalidatePath("/[locale]/events/[slug]/[year]", "page");
      revalidatePath("/[locale]/account", "page");
      revalidatePath("/[locale]/account/history", "page");
      revalidatePath("/[locale]/account/messages", "page");
      revalidatePath("/", "layout");
    });
  } catch (error) {
    console.error("[refund] revalidate failed:", error);
  }
}

let settlingAcceptedRefunds: Promise<number> | null = null;

/**
 * Один общий дочитывающий запрос на параллельный рендер шапки и страницы.
 * Новый возврат в ApiPay не создаёт.
 */
export function settleAcceptedRefundsOnce() {
  if (!settlingAcceptedRefunds) {
    settlingAcceptedRefunds = settleAcceptedRefunds()
      .catch((error: unknown) => {
        console.error("[refund] settle before pending count failed:", error);
        return 0;
      })
      .finally(() => {
        settlingAcceptedRefunds = null;
      });
  }
  return settlingAcceptedRefunds;
}

/** Дочитывает уже отправленный возврат. Новый возврат в ApiPay не создаёт. */
export async function settleAcceptedRefunds() {
  if (!isApipayConfigured()) return 0;
  const rows = await prisma.refundRequest.findMany({
    where: {
      status: "PENDING",
      apipayRefundId: { not: null },
      OR: [{ payoutStatus: null }, { payoutStatus: { in: ["pending", "processing"] } }],
    },
    select: {
      id: true,
      amount: true,
      invoiceId: true,
      apipayRefundId: true,
      payoutStatus: true,
      status: true,
      registration: { select: { status: true, kaspiOrderId: true } },
    },
  });

  let applied = 0;
  for (const row of rows) {
    const refundId = refundIdOf(row.apipayRefundId);
    const invoiceId = row.invoiceId || row.registration.kaspiOrderId;
    if (!refundId || !invoiceId) continue;

    let trusted: Awaited<ReturnType<typeof getInvoiceRefund>>;
    try {
      trusted = await getInvoiceRefund(invoiceId, refundId);
    } catch (error) {
      console.error("[apipay] delayed refund lookup failed:", { refundRequestId: row.id, invoiceId, refundId, error });
      continue;
    }
    if (!trusted) continue;
    if (trusted.status === "failed") {
      await prisma.refundRequest.update({
        where: { id: row.id },
        data: { payoutStatus: "failed" },
      });
      continue;
    }

    const verdict = verifyRefundMatch({
      invoiceId,
      refundId,
      trusted,
      local: {
        apipayRefundId: refundId,
        invoiceId,
        amount: row.amount,
        payoutStatus: row.payoutStatus,
        status: row.status,
        registrationStatus: row.registration.status,
      },
    });
    if (verdict !== "apply" && verdict !== "replay") continue;
    const outcome = await finalizeMatchedRefund(row.id);
    if (outcome.result === "applied" || outcome.result === "replay") applied += 1;
  }
  if (applied > 0) revalidateRefundViews();
  return applied;
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
