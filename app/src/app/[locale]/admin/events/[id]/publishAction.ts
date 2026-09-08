"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type PublishState = { error?: string; ok?: boolean; isPublished?: boolean };

export async function togglePublishedAction(
  eventId: string,
  _prev: PublishState,
  formData: FormData,
): Promise<PublishState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const publish = formData.get("publish") === "1";

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { isPublished: publish },
    select: { isPublished: true, year: true, race: { select: { slug: true } } },
  });

  revalidatePath(`/[locale]/admin/events/${eventId}`, "page");
  revalidatePath(`/[locale]/events/${updated.race.slug}/${updated.year}`, "page");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/events", "page");

  return { ok: true, isPublished: updated.isPublished };
}
