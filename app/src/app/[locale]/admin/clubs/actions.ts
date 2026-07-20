"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";

export type ActionState = { error?: string; success?: boolean };

const ClubSchema = z.object({
  name: z.string().trim().min(1).max(200),
  city: z.string().trim().max(100).optional(),
});

function parse(formData: FormData) {
  const parsed = ClubSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" as const };
  return { data: parsed.data };
}

export async function createClubAction(locale: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parse(formData);
  if ("error" in parsed) return parsed;

  const club = await prisma.runningClub.create({
    data: { name: parsed.data.name, city: parsed.data.city ?? null },
  });

  revalidatePath("/[locale]/admin/clubs", "page");
  redirect({ href: `/admin/clubs/${club.id}`, locale });
  return {};
}

export async function updateClubAction(clubId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parse(formData);
  if ("error" in parsed) return parsed;

  await prisma.runningClub.update({
    where: { id: clubId },
    data: { name: parsed.data.name, city: parsed.data.city ?? null },
  });

  revalidatePath("/[locale]/admin/clubs", "page");
  revalidatePath("/[locale]/admin/clubs/[id]", "page");
  return { success: true };
}

export async function deleteClubAction(locale: string, clubId: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  void _prev; void _fd;

  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const hasReg = await prisma.registration.findFirst({ where: { runningClubId: clubId }, select: { id: true } });
  if (hasReg) return { error: "hasRegistrations" };

  await prisma.runningClub.delete({ where: { id: clubId } });
  revalidatePath("/[locale]/admin/clubs", "page");
  redirect({ href: "/admin/clubs", locale });
  return {};
}
