"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";

export type BuyTransferState = { error?: string };

export async function buyTransferAction(
  locale: string,
  registrationId: string,
  _prev: BuyTransferState,
  _formData: FormData,
): Promise<BuyTransferState> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthorized" };

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      userId: true,
      status: true,
      includesTransfer: true,
      eventId: true,
      event: { select: { transferPrice: true, location: true } },
    },
  });

  if (!registration || registration.userId !== userId) return { error: "not_found" };
  if (registration.status !== "PAID") return { error: "not_paid" };
  if (registration.includesTransfer) return { error: "already_included" };
  if (!registration.event.transferPrice || !registration.event.location) return { error: "not_available" };

  // Check for an existing pending transfer payment (don't create a duplicate)
  const existing = await prisma.registration.findFirst({
    where: { userId, eventId: registration.eventId, isTransferOnly: true, status: "RESERVED" },
    select: { id: true },
  });

  const transferRegId = existing
    ? existing.id
    : (
        await prisma.registration.create({
          data: {
            userId,
            eventId: registration.eventId,
            status: "RESERVED",
            isTransferOnly: true,
            includesTransfer: true,
            reservedUntil: new Date(Date.now() + 30 * 60 * 1000),
          },
          select: { id: true },
        })
      ).id;

  redirect({ href: `/pay/${transferRegId}`, locale });
  return {};
}
