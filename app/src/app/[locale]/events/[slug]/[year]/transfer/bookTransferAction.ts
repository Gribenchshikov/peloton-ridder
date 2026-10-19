"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";
import { ensureTransferReservation } from "@/lib/transferReservation";

export type BookTransferState = {
  error?: string;
};

export async function bookTransferAction(
  locale: string,
  _prev: BookTransferState,
  _formData: FormData,
): Promise<BookTransferState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "unauthenticated" };

  const eventId = _formData.get("eventId") as string;
  if (!eventId) return { error: "invalid" };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true, transferPrice: true, race: { select: { slug: true } }, year: true },
  });
  if (!event || event.status !== "OPEN" || !event.transferPrice) return { error: "unavailable" };

  const transferRegId = await ensureTransferReservation(session.user.id, event.id);
  redirect({ href: `/pay/${transferRegId}`, locale });
  return {};
}
