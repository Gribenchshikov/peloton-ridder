"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendOrganizerMessageEmail } from "@/lib/mailer";

export async function sendMessageToOrganizerAction(
  eventId: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "unauthenticated" };

  const trimmed = message.trim();
  if (!trimmed || trimmed.length < 5) return { ok: false, error: "too_short" };
  if (trimmed.length > 1000) return { ok: false, error: "too_long" };

  const [user, event] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true, email: true },
    }),
    prisma.event.findUnique({
      where: { id: eventId },
      select: { race: { select: { name: true } }, year: true },
    }),
  ]);

  if (!user || !event) return { ok: false, error: "not_found" };

  const raceName = `${event.race.name} ${event.year}`;
  await sendOrganizerMessageEmail(
    `${user.firstName} ${user.lastName}`,
    user.email,
    raceName,
    trimmed,
  );

  return { ok: true };
}
