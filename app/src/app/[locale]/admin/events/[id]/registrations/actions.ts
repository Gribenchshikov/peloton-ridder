"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { reassignPaidBibNumbers } from "@/lib/bibNumbers";
import { notifyWaitlistForDistance } from "@/lib/waitlist";

export type RegistrationAdminActionState = {
  error?: "unauthorized" | "not_found" | "inactive" | "full" | "has_results" | "invalid";
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
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  revalidatePath("/[locale]/account", "page");
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
      select: { eventId: true, distanceId: true, status: true },
    });
    if (!registration || registration.eventId !== eventId) return { error: "not_found" as const };

    if (registration.distanceId) await lockDistances(tx, [registration.distanceId]);
    const hasResults = await tx.result.findFirst({ where: { eventId }, select: { id: true } });
    if (hasResults) return { error: "has_results" as const };
    if (!isActiveStatus(registration.status)) return { error: "inactive" as const };

    await tx.registration.update({
      where: { id: registrationId },
      data: {
        status: "CANCELLED",
        reservedUntil: null,
        bibNumber: null,
        adminComment: parsed.data.adminComment,
        allowReregistration: parsed.data.allowReregistration,
      },
    });
    await reassignPaidBibNumbers(tx, eventId);
    return { success: "cancelled" as const, distanceId: registration.distanceId };
  });

  if ("error" in outcome) return outcome;
  if (outcome.distanceId) void notifyWaitlistForDistance(outcome.distanceId);
  revalidateRegistrationPages();
  const { distanceId: _, ...rest } = outcome;
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

    if (registration.distanceId) await lockDistances(tx, [registration.distanceId]);
    const hasResults = await tx.result.findFirst({ where: { eventId }, select: { id: true } });
    if (hasResults) return { error: "has_results" as const };
    if (registration.status !== "CANCELLED") return { error: "inactive" as const };

    const paid = parsed.data.paid === true;
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
        OR: [
          { status: "PAID" },
          { status: "RESERVED", reservedUntil: { gt: new Date() } },
        ],
      },
    }) : 0;
    if (distance) {
      const capacity = distance.bibRangeEnd - distance.bibRangeStart + 1;
      if (activeCount >= capacity) return { error: "full" as const };
    }

    await tx.registration.update({
      where: { id: registrationId },
      data: {
        status: paid ? "PAID" : "RESERVED",
        reservedUntil: paid ? null : new Date(Date.now() + RESERVATION_TTL_MS),
        bibNumber: null,
        adminComment: parsed.data.adminComment,
        allowReregistration: false,
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

    const activeOnTarget = await tx.registration.count({
      where: {
        distanceId: parsed.data.distanceId,
        id: { not: registrationId },
        OR: [
          { status: "PAID" },
          { status: "RESERVED", reservedUntil: { gt: new Date() } },
        ],
      },
    });
    const capacity = targetDistance.bibRangeEnd - targetDistance.bibRangeStart + 1;
    if (activeOnTarget >= capacity) return { error: "full" as const };

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

  const updated = await prisma.registration.updateMany({
    where: { id: registrationId, eventId, status: "CANCELLED" },
    data: { allowReregistration },
  });
  if (updated.count === 0) return { error: "inactive" };

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
      registration: {
        select: { id: true, eventId: true, distanceId: true, status: true, includesTransfer: true },
      },
    },
  });
  if (!refund || refund.registration.eventId !== eventId) return { error: "not_found" };
  if (refund.status !== "PENDING") return { error: "already_resolved" };

  await prisma.$transaction(async (tx) => {
    await tx.refundRequest.update({
      where: { id: refundRequestId },
      data: { status: "CONFIRMED", resolvedAt: new Date() },
    });
    if (refund.type === "SLOT") {
      await tx.registration.update({
        where: { id: refund.registration.id },
        data: { status: "CANCELLED", reservedUntil: null, bibNumber: null },
      });
      await reassignPaidBibNumbers(tx, eventId);
    } else {
      await tx.registration.update({
        where: { id: refund.registration.id },
        data: { includesTransfer: false, transferUsedAt: null },
      });
    }
  });

  if (refund.type === "SLOT" && refund.registration.distanceId) {
    void notifyWaitlistForDistance(refund.registration.distanceId);
  }

  revalidateRegistrationPages();
  return { success: true };
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
