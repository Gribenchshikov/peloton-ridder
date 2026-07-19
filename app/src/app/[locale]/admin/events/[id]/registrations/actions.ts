"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { reassignPaidBibNumbers } from "@/lib/bibNumbers";

export type RegistrationAdminActionState = {
  error?: "unauthorized" | "not_found" | "inactive" | "full" | "has_results" | "invalid";
  success?: "cancelled" | "distance_changed";
};

const ChangeDistanceSchema = z.object({ distanceId: z.string().min(1) });
const CancelRegistrationSchema = z.object({
  adminComment: z.string().trim().min(1).max(1000),
  allowReregistration: z.preprocess((value) => value === "on", z.boolean()),
});

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

    await lockDistances(tx, [registration.distanceId]);
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
    return { success: "cancelled" as const };
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

    await lockDistances(tx, [registration.distanceId, parsed.data.distanceId]);
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
