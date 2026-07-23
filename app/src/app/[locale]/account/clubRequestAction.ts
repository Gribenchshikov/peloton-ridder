"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type ClubRequestState = { error?: string; ok?: boolean };

export async function joinClubAction(clubId: string): Promise<{ error?: string; ok?: boolean }> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthorized" };
  if (!clubId) return { error: "invalid" };

  await prisma.user.update({
    where: { id: userId },
    data: { runningClubId: clubId },
  });

  revalidatePath("/[locale]/account", "page");
  return { ok: true };
}

export async function submitClubRequestAction(
  _prev: ClubRequestState,
  formData: FormData,
): Promise<ClubRequestState> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthorized" };

  const clubName = String(formData.get("clubName") ?? "").trim();
  if (!clubName || clubName.length < 2) return { error: "too_short" };
  if (clubName.length > 100) return { error: "too_long" };

  const pending = await prisma.clubMembershipRequest.findFirst({
    where: { userId, status: "PENDING" },
  });
  if (pending) return { error: "already_pending" };

  await prisma.clubMembershipRequest.create({
    data: { userId, clubName },
  });

  revalidatePath("/[locale]/account", "page");
  return { ok: true };
}
