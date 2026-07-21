"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type BuyTransferState = { error?: string; ok?: boolean };

export async function buyTransferAction(
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
      event: { select: { transferPrice: true, location: true } },
    },
  });

  if (!registration || registration.userId !== userId) return { error: "not_found" };
  if (registration.status !== "PAID") return { error: "not_paid" };
  if (registration.includesTransfer) return { error: "already_included" };
  if (!registration.event.transferPrice || !registration.event.location) return { error: "not_available" };

  await prisma.registration.update({
    where: { id: registrationId },
    data: { includesTransfer: true },
  });

  revalidatePath("/[locale]/events/[slug]/[year]/register", "page");
  return { ok: true };
}
