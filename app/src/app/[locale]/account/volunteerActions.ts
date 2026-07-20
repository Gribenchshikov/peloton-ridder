"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { sendAdminAlertEmail } from "@/lib/mailer";
import { revalidatePath } from "next/cache";

export async function claimVolunteerRewardAction(): Promise<{ ok?: boolean; error?: string }> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      isVolunteer: true,
      volunteerRewardClaimedAt: true,
      volunteerApplications: { where: { status: "APPROVED" }, select: { id: true } },
    },
  });

  if (!user?.isVolunteer) return { error: "not_volunteer" };
  if (user.volunteerRewardClaimedAt) return { error: "already_claimed" };

  const thresholdSetting = await prisma.siteSetting.findUnique({
    where: { key: "volunteer_slots_threshold" },
  });
  const threshold = Number(thresholdSetting?.value ?? 3);

  if (user.volunteerApplications.length < threshold) return { error: "threshold_not_reached" };

  await prisma.user.update({
    where: { id: userId },
    data: { volunteerRewardClaimedAt: new Date() },
  });

  const admins = await prisma.user.findMany({
    where: { isAdmin: true },
    select: { email: true },
  });
  const adminEmails = admins.map((a) => a.email);

  await sendAdminAlertEmail(
    adminEmails,
    "Волонтёр запрашивает награду (100% ваучер)",
    `${user.firstName} ${user.lastName} <${user.email}>`,
    "система",
    new Date(),
  );

  revalidatePath("/[locale]/account", "page");
  return { ok: true };
}
