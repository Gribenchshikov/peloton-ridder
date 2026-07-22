"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "@/i18n/navigation";

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
    select: { id: true, status: true, transferPrice: true, registrationDeadline: true, race: { select: { slug: true } }, year: true },
  });
  if (!event || event.status !== "OPEN" || !event.transferPrice) return { error: "unavailable" };
  if (event.registrationDeadline < new Date()) return { error: "closed" };

  // Проверяем нет ли уже активной записи (слот или трансфер)
  const existing = await prisma.registration.findFirst({
    where: {
      userId: session.user.id,
      eventId: event.id,
      status: { in: ["RESERVED", "PAID"] },
    },
  });
  if (existing) {
    // Если есть PAID-слот без трансфера — апдейтим его
    if (existing.status === "PAID" && !existing.includesTransfer && !existing.isTransferOnly) {
      await prisma.registration.update({
        where: { id: existing.id },
        data: { includesTransfer: true },
      });
      redirect({ href: `/events/${event.race.slug}/${event.year}/register`, locale });
    }
    return { error: "already_booked" };
  }

  const reg = await prisma.registration.create({
    data: {
      userId: session.user.id,
      eventId: event.id,
      status: "RESERVED",
      isTransferOnly: true,
      includesTransfer: true,
      reservedUntil: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  redirect({ href: `/pay/${reg.id}`, locale });
  return {};
}
