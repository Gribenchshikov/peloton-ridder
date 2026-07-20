"use server";

import { verifySync } from "otplib";
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

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { totpSecret: true },
  });
  if (!admin?.totpSecret) return { error: "no_2fa" };

  const code = (formData.get("code") as string ?? "").trim();
  const result = verifySync({ token: code, secret: admin.totpSecret });
  if (!result.valid) return { error: "invalid_code" };

  const publish = formData.get("publish") === "1";

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { isPublished: publish },
    select: { isPublished: true },
  });

  revalidatePath(`/[locale]/admin/events/${eventId}`, "page");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/events", "page");

  return { ok: true, isPublished: updated.isPublished };
}
