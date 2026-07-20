"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";

const JoinWaitlistSchema = z.object({
  eventId: z.string().min(1),
  distanceId: z.string().min(1),
  contactNote: z.string().trim().max(500).optional(),
});

export type JoinWaitlistState = { error?: string; success?: boolean };

export async function joinWaitlistAction(
  _prevState: JoinWaitlistState,
  formData: FormData,
): Promise<JoinWaitlistState> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthorized" };

  const parsed = JoinWaitlistSchema.safeParse({
    eventId: formData.get("eventId"),
    distanceId: formData.get("distanceId"),
    contactNote: formData.get("contactNote") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };

  const { eventId, distanceId, contactNote } = parsed.data;

  const [distance, existing, alreadyOnList] = await Promise.all([
    prisma.distance.findUnique({ where: { id: distanceId }, select: { eventId: true } }),
    prisma.registration.findFirst({
      where: { userId, eventId, OR: [{ status: "PAID" }, { status: "RESERVED", reservedUntil: { gt: new Date() } }] },
    }),
    prisma.waitlist.findFirst({ where: { userId, distanceId } }),
  ]);

  if (!distance || distance.eventId !== eventId) return { error: "invalid" };
  if (existing) return { error: "already_registered" };
  if (alreadyOnList) return { error: "already_on_list" };

  await prisma.waitlist.create({
    data: { userId, eventId, distanceId, contactNote: contactNote ?? "" },
  });

  revalidatePath(`/[locale]/events`);
  return { success: true };
}
