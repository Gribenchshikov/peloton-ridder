"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { ensureTransferReservation } from "@/lib/transferReservation";

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
      eventId: true,
      event: { select: { transferPrice: true, location: true } },
    },
  });

  if (!registration || registration.userId !== userId) return { error: "not_found" };
  if (registration.status !== "PAID") return { error: "not_paid" };
  if (!registration.event.transferPrice || !registration.event.location) return { error: "not_available" };

  const transferRegId = await ensureTransferReservation(userId, registration.eventId);
  redirect({ href: `/pay/${transferRegId}`, locale });
  return {};
}
