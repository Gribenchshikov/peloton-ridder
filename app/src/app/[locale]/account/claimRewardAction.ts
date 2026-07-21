"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { sendAdminAlertEmail } from "@/lib/mailer";
import { revalidatePath } from "next/cache";

export type ClaimRewardState = { error?: string; code?: string };

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "RIDVOL-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function claimVolunteerRewardAction(
  threshold: number,
  _prev: ClaimRewardState,
  _formData: FormData,
): Promise<ClaimRewardState> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      volunteerRewardClaimedAt: true,
      volunteerApplications: { select: { creditedAt: true } },
    },
  });
  if (!user) return { error: "not_found" };
  if (user.volunteerRewardClaimedAt) return { error: "already_claimed" };

  const credited = user.volunteerApplications.filter((a) => a.creditedAt).length;
  if (credited < threshold) return { error: "not_reached" };

  const code = generateCode();

  await prisma.$transaction(async (tx) => {
    await tx.promoCode.create({
      data: {
        code,
        discountType: "PERCENT",
        discountValue: 100,
        maxUses: 1,
        active: true,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { volunteerRewardClaimedAt: new Date(), volunteerPromoCode: code },
    });
  });

  const adminEmails = (
    await prisma.user.findMany({ where: { isAdmin: true }, select: { email: true } })
  ).map((u) => u.email);

  const name = `${user.firstName} ${user.lastName}`;
  await sendAdminAlertEmail(
    adminEmails,
    `Волонтёр запрашивает награду (100% ваучер)`,
    `${name} <${user.email}>`,
    "система",
    new Date(),
  );

  revalidatePath("/[locale]/account", "page");
  return { code };
}
