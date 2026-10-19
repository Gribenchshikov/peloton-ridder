"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminId, requireOperatorOrAdminId } from "@/lib/session";
import { reassignPaidBibNumbers } from "@/lib/bibNumbers";
import { notifyWaitlistForDistance } from "@/lib/waitlist";
import {
  applySlotRefundToRegistration,
  apipayAccepted,
  canApplyLocalRefund,
  CLEARED_PAYMENT_FIELDS,
  payoutRegistrationRefund,
  refundPaidRegistrationOnAdminCancel,
  refundTransferByAdmin,
} from "@/lib/refundPayout";
import { notifyFromRegistration } from "@/lib/userMessages";
import { capacityTakenWhere } from "@/lib/slotOccupancy";
import { canBoardTransfer } from "@/lib/registrationStatus";

export type RegistrationAdminActionState = {
  error?: "unauthorized" | "not_found" | "inactive" | "full" | "has_results" | "invalid" | "payout_failed";
  success?: "cancelled" | "distance_changed" | "permission_changed" | "restored";
};

const ChangeDistanceSchema = z.object({ distanceId: z.string().min(1) });
const CancelRegistrationSchema = z.object({
  adminComment: z.string().trim().min(1).max(1000),
  allowReregistration: z.preprocess((value) => value === "on", z.boolean()),
});
const RestoreRegistrationSchema = z.object({
  adminComment: z.string().trim().min(1).max(1000),
  paid: z.preprocess((value) => value === "on", z.boolean()).optional(),
});

const RESERVATION_TTL_MS = 30 * 60 * 1000;

function isActiveStatus(status: "RESERVED" | "PAID" | "CANCELLED") {
  return status === "RESERVED" || status === "PAID";
}

async function lockDistances(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], distanceIds: string[]) {
  for (const id of [...new Set(distanceIds)].sort()) {
    await tx.$queryRaw`SELECT "id" FROM "Distance" WHERE "id" = ${id} FOR UPDATE`;
  }
}

function revalidateRegistrationPages() {
  revalidatePath("/[locale]/admin/events/[id]/registrations", "page");
  revalidatePath("/[locale]/admin/registrations/[slug]/[year]", "page");
  revalidatePath("/[locale]/admin/refunds", "page");
  revalidatePath("/[locale]/admin/reports", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  revalidatePath("/[locale]/account", "page");
  revalidatePath("/[locale]/account/history", "page");
  revalidatePath("/[locale]/account/messages", "page");
  revalidatePath("/", "layout");
}

export async function cancelRegistrationAction(
  registrationId: string,
  eventId: string,
  _prevState: RegistrationAdminActionState,
  formData: FormData,
): Promise<RegistrationAdminActionState> {
  void _prevState;

  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = CancelRegistrationSchema.safeParse({
    adminComment: formData.get("adminComment"),
    allowReregistration: formData.get("allowReregistration"),
  });
  if (!parsed.success) return { error: "invalid" };

  const outcome = await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      select: {
        eventId: true,
        distanceId: true,
        status: true,
        includesTransfer: true,
        isTransferOnly: true,
      },
    });
    if (!registration || registration.eventId !== eventId) return { error: "not_found" as const };

    if (registration.distanceId) await lockDistances(tx, [registration.distanceId]);
    const hasResults = await tx.result.findFirst({ where: { eventId }, select: { id: true } });
    if (hasResults) return { error: "has_results" as const };
    if (!isActiveStatus(registration.status)) return { error: "inactive" as const };
    if (registration.isTransferOnly) return { error: "inactive" as const };

    const wasPaid = registration.status === "PAID";
    await tx.registration.update({
      where: { id: registrationId },
      data: wasPaid
        ? {
            adminComment: parsed.data.adminComment,
            allowReregistration: parsed.data.allowReregistration,
          }
        : {
            status: "CANCELLED",
            reservedUntil: null,
            bibNumber: null,
            adminComment: parsed.data.adminComment,
            allowReregistration: parsed.data.allowReregistration,
          },
    });
    if (!wasPaid) await reassignPaidBibNumbers(tx, eventId);
    return {
      success: "cancelled" as const,
      distanceId: registration.distanceId,
      wasPaid,
    };
  });

  if ("error" in outcome) return outcome;
  if (outcome.wasPaid) {
    try {
      const payout = await refundPaidRegistrationOnAdminCancel(registrationId);
      if (!canApplyLocalRefund(payout)) {
        revalidateRegistrationPages();
        return { error: "payout_failed" };
      }
    } catch (error) {
      console.error("[refund] admin cancel payout failed:", error);
      revalidateRegistrationPages();
      return { error: "payout_failed" };
    }
  }
  await notifyFromRegistration(registrationId, "ADMIN_CANCEL");
  if (parsed.data.allowReregistration) {
    await notifyFromRegistration(registrationId, "REREGISTRATION_ALLOWED");
  }
  if (outcome.distanceId) void notifyWaitlistForDistance(outcome.distanceId);
  revalidateRegistrationPages();
  const { distanceId: _, wasPaid: __, ...rest } = outcome;
  return rest;
}

export async function restoreRegistrationAction(
  registrationId: string,
  eventId: string,
  _prevState: RegistrationAdminActionState,
  formData: FormData,
): Promise<RegistrationAdminActionState> {
  void _prevState;

  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = RestoreRegistrationSchema.safeParse({
    adminComment: formData.get("adminComment"),
    paid: formData.get("paid"),
  });
  if (!parsed.success) return { error: "invalid" };

  const outcome = await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      select: { eventId: true, distanceId: true, status: true },
    });
    if (!registration || registration.eventId !== eventId) return { error: "not_found" as const };
    const eventMeta = await tx.event.findUnique({
      where: { id: eventId },
      select: { race: { select: { isMass: true } } },
    });
    const holdsReservation = Boolean(eventMeta?.race.isMass);

    if (registration.distanceId) await lockDistances(tx, [registration.distanceId]);
    const hasResults = await tx.result.findFirst({ where: { eventId }, select: { id: true } });
    if (hasResults) return { error: "has_results" as const };
    if (registration.status !== "CANCELLED") return { error: "inactive" as const };

    const slotRefunded = await tx.refundRequest.findFirst({
      where: { registrationId, type: "SLOT", status: "CONFIRMED" },
      select: { id: true },
    });
    // После возврата денег слот нельзя восстановить как оплаченный — нужна новая оплата.
    const paid = parsed.data.paid === true && !slotRefunded;
    const distance = registration.distanceId
      ? await tx.distance.findUnique({
          where: { id: registration.distanceId },
          select: { bibRangeStart: true, bibRangeEnd: true },
        })
      : null;

    if (registration.distanceId && !distance) return { error: "invalid" as const };

    const activeCount = registration.distanceId ? await tx.registration.count({
      where: {
        distanceId: registration.distanceId,
        id: { not: registrationId },
        isTransferOnly: false,
        ...capacityTakenWhere(holdsReservation),
      },
    }) : 0;
    if (distance && distance.bibRangeStart !== null && distance.bibRangeEnd !== null) {
      const capacity = distance.bibRangeEnd - distance.bibRangeStart + 1;
      if (activeCount >= capacity) return { error: "full" as const };
    }

    await tx.registration.update({
      where: { id: registrationId },
      data: {
        status: paid ? "PAID" : "RESERVED",
        reservedUntil: paid || holdsReservation ? null : new Date(Date.now() + RESERVATION_TTL_MS),
        bibNumber: null,
        adminComment: parsed.data.adminComment,
        allowReregistration: false,
        ...(paid ? {} : CLEARED_PAYMENT_FIELDS),
      },
    });

    if (paid) {
      await reassignPaidBibNumbers(tx, eventId);
    }

    return { success: "restored" as const };
  });

  if ("error" in outcome) return outcome;
  revalidateRegistrationPages();
  return outcome;
}

export async function changeRegistrationDistanceAction(
  registrationId: string,
  eventId: string,
  _prevState: RegistrationAdminActionState,
  formData: FormData,
): Promise<RegistrationAdminActionState> {
  void _prevState;

  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = ChangeDistanceSchema.safeParse({ distanceId: formData.get("distanceId") });
  if (!parsed.success) return { error: "invalid" };

  const outcome = await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      select: { eventId: true, distanceId: true, status: true },
    });
    if (!registration || registration.eventId !== eventId) return { error: "not_found" as const };
    if (registration.distanceId === parsed.data.distanceId) return { success: "distance_changed" as const };

    await lockDistances(tx, [registration.distanceId, parsed.data.distanceId].filter(Boolean) as string[]);
    const [targetDistance, hasResults] = await Promise.all([
      tx.distance.findUnique({
        where: { id: parsed.data.distanceId },
        select: { eventId: true, bibRangeStart: true, bibRangeEnd: true },
      }),
      tx.result.findFirst({ where: { eventId }, select: { id: true } }),
    ]);
    if (!targetDistance || targetDistance.eventId !== eventId) return { error: "invalid" as const };
    if (hasResults) return { error: "has_results" as const };
    if (!isActiveStatus(registration.status)) return { error: "inactive" as const };

    const eventMeta = await tx.event.findUnique({
      where: { id: eventId },
      select: { race: { select: { isMass: true } } },
    });
    const activeOnTarget = await tx.registration.count({
      where: {
        distanceId: parsed.data.distanceId,
        id: { not: registrationId },
        isTransferOnly: false,
        ...capacityTakenWhere(Boolean(eventMeta?.race.isMass)),
      },
    });
    if (targetDistance.bibRangeStart !== null && targetDistance.bibRangeEnd !== null) {
      const capacity = targetDistance.bibRangeEnd - targetDistance.bibRangeStart + 1;
      if (activeOnTarget >= capacity) return { error: "full" as const };
    }

    await tx.registration.update({
      where: { id: registrationId },
      data: { distanceId: parsed.data.distanceId, bibNumber: null },
    });
    await reassignPaidBibNumbers(tx, eventId);
    return { success: "distance_changed" as const };
  });

  if ("error" in outcome) return outcome;
  revalidateRegistrationPages();
  return outcome;
}

export async function toggleReregistrationPermissionAction(
  registrationId: string,
  eventId: string,
  allowReregistration: boolean,
  _prevState: RegistrationAdminActionState,
  _formData: FormData,
): Promise<RegistrationAdminActionState> {
  void _prevState;
  void _formData;

  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const registration = await prisma.registration.findFirst({
    where: { id: registrationId, eventId, status: "CANCELLED" },
    select: { allowReregistration: true },
  });
  if (!registration) return { error: "inactive" };

  await prisma.registration.update({
    where: { id: registrationId },
    data: { allowReregistration },
  });
  if (allowReregistration && !registration.allowReregistration) {
    await notifyFromRegistration(registrationId, "REREGISTRATION_ALLOWED");
  }

  revalidateRegistrationPages();
  return { success: "permission_changed" };
}

export type RefundActionState = { error?: string; success?: boolean };

export async function confirmRefundAction(
  refundRequestId: string,
  eventId: string,
  _prevState: RefundActionState,
  _formData: FormData,
): Promise<RefundActionState> {
  void _prevState; void _formData;

  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const refund = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    select: {
      status: true,
      type: true,
      payoutStatus: true,
      apipayRefundId: true,
      amount: true,
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
  if (!refund || refund.registration.eventId !== eventId) return { error: "not_found" };
  if (refund.status !== "PENDING") return { error: "already_resolved" };

  const alreadyAccepted = apipayAccepted({
    amount: refund.amount ?? 0,
    payoutStatus: (refund.payoutStatus ?? "skipped") as
      | "skipped"
      | "pending"
      | "processing"
      | "failed"
      | "completed",
    apipayRefundId: refund.apipayRefundId,
  });

  let payout = alreadyAccepted
    ? {
        amount: refund.amount ?? 0,
        payoutStatus: (refund.payoutStatus ?? "pending") as
          | "skipped"
          | "pending"
          | "processing"
          | "failed"
          | "completed",
        apipayRefundId: refund.apipayRefundId,
      }
    : null;

  if (!payout) {
    const claimed = await prisma.refundRequest.updateMany({
      where: {
        id: refundRequestId,
        status: "PENDING",
        OR: [{ payoutStatus: null }, { payoutStatus: { in: ["skipped", "failed"] } }],
      },
      data: { payoutStatus: "processing" },
    });
    if (claimed.count === 0) {
      return { error: "payout_failed" };
    }
    payout = await payoutRegistrationRefund(
      refund.registration.id,
      refund.type,
      refund.amount,
      refundRequestId,
    );
  }
  await prisma.refundRequest.update({
    where: { id: refundRequestId },
    data: {
      amount: payout.amount || refund.amount,
      apipayRefundId: payout.apipayRefundId,
      payoutStatus: payout.payoutStatus,
    },
  });

  if (!apipayAccepted(payout)) {
    console.error("[apipay] refund not accepted by ApiPay; local request stays pending", {
      refundRequestId,
      type: refund.type,
      payoutStatus: payout.payoutStatus,
      apipayRefundId: payout.apipayRefundId,
      amount: payout.amount,
    });
    return { error: "payout_failed" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.refundRequest.update({
      where: { id: refundRequestId },
      data: { status: "CONFIRMED", resolvedAt: new Date() },
    });
    if (refund.type === "SLOT") {
      const keepTransfer = refund.registration.includesTransfer && !refund.registration.isTransferOnly;
      await applySlotRefundToRegistration(tx, refund.registration.id, { keepTransfer });
      await reassignPaidBibNumbers(tx, eventId);
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
        await reassignPaidBibNumbers(tx, eventId);
      }
    }
  });

  if (refund.type === "SLOT" && refund.registration.distanceId) {
    void notifyWaitlistForDistance(refund.registration.distanceId);
  }

  if (payout.amount > 0) {
    await notifyFromRegistration(
      refund.registration.id,
      refund.type === "TRANSFER" ? "REFUND_TRANSFER" : "REFUND_SLOT",
      { amount: payout.amount },
    );
  }

  revalidateRegistrationPages();
  return { success: true };
}

export async function toggleKitIssuedAction(
  registrationId: string,
  eventId: string,
  issued: boolean,
): Promise<{ error?: string }> {
  const adminId = await requireOperatorOrAdminId();
  if (!adminId) return { error: "unauthorized" };

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { eventId: true, status: true, isTransferOnly: true },
  });
  if (!reg || reg.eventId !== eventId) return { error: "not_found" };
  if (reg.status !== "PAID" || reg.isTransferOnly) return { error: "inactive" };

  await prisma.registration.update({
    where: { id: registrationId },
    data: { kitPickedUpAt: issued ? new Date() : null },
  });

  revalidateRegistrationPages();
  return {};
}

export async function adminRefundTransferAction(
  registrationId: string,
  eventId: string,
  _prevState: { error?: string; success?: boolean } = {},
  _formData?: FormData,
): Promise<{ error?: string; success?: boolean }> {
  void _prevState;
  void _formData;
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { eventId: true, includesTransfer: true, isTransferOnly: true, status: true },
  });
  if (!registration || registration.eventId !== eventId) return { error: "not_found" };
  if (registration.status !== "PAID" && registration.status !== "CANCELLED") return { error: "inactive" };
  if (!registration.includesTransfer && !registration.isTransferOnly) return { error: "inactive" };

  const payout = await refundTransferByAdmin(registrationId);
  if (!apipayAccepted(payout) && payout.payoutStatus !== "skipped") {
    return { error: "payout_failed" };
  }
  revalidateRegistrationPages();
  return { success: true };
}

export async function toggleTransferBoardedAction(
  registrationId: string,
  eventId: string,
  boarded: boolean,
): Promise<{ error?: string }> {
  const adminId = await requireOperatorOrAdminId();
  if (!adminId) return { error: "unauthorized" };

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      eventId: true,
      status: true,
      includesTransfer: true,
      isTransferOnly: true,
      refundRequests: { select: { type: true, status: true } },
    },
  });
  if (!reg || reg.eventId !== eventId) return { error: "not_found" };
  if (boarded && !canBoardTransfer(reg)) return { error: "transfer_refunded" };

  await prisma.registration.update({
    where: { id: registrationId },
    data: { transferUsedAt: boarded ? new Date() : null },
  });

  revalidateRegistrationPages();
  return {};
}

export async function rejectRefundAction(
  refundRequestId: string,
  eventId: string,
  adminNote: string,
  _prevState: RefundActionState,
  _formData: FormData,
): Promise<RefundActionState> {
  void _prevState; void _formData;

  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const refund = await prisma.refundRequest.findUnique({
    where: { id: refundRequestId },
    select: { status: true, registration: { select: { eventId: true } } },
  });
  if (!refund || refund.registration.eventId !== eventId) return { error: "not_found" };
  if (refund.status !== "PENDING") return { error: "already_resolved" };

  await prisma.refundRequest.update({
    where: { id: refundRequestId },
    data: { status: "REJECTED", adminNote: adminNote || null, resolvedAt: new Date() },
  });

  revalidateRegistrationPages();
  return { success: true };
}
