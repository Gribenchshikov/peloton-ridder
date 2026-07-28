"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";

const emptyToUndefined = (value: unknown) => (value === "" || value == null ? undefined : value);

const httpUrlSchema = z.string().trim().url().refine(
  (value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  },
  { message: "must be an http(s) URL" },
);

const MemberSchema = z.object({
  name: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  bio: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  photoUrl: z.preprocess(emptyToUndefined, httpUrlSchema.optional()),
  type: z.enum(["TEAM", "VOLUNTEER"]),
  order: z.coerce.number().int().min(0).max(9999),
});

export type ActionState = { error?: string; success?: boolean };

export async function createMemberAction(
  locale: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = MemberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  await prisma.teamMember.create({ data: parsed.data });
  revalidatePath("/[locale]/about", "page");
  return redirect({ href: "/admin/club", locale });
}

export async function updateMemberAction(
  locale: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = MemberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  await prisma.teamMember.update({ where: { id }, data: parsed.data });
  revalidatePath("/[locale]/about", "page");
  revalidatePath("/[locale]/admin/club", "page");
  return { success: true };
}

export async function deleteMemberAction(locale: string, id: string): Promise<void> {
  const adminId = await requireAdminId();
  if (!adminId) return;
  await prisma.teamMember.delete({ where: { id } });
  revalidatePath("/[locale]/about", "page");
  revalidatePath("/[locale]/admin/club", "page");
  redirect({ href: "/admin/club", locale });
}

const TrainingGroupSchema = z.object({
  title: z.string().trim().min(1).max(200),
  schedule: z.string().trim().min(1).max(500),
  description: z.string().trim().min(1).max(2000),
  order: z.coerce.number().int().min(0).max(9999),
});

export async function createTrainingGroupAction(
  locale: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = TrainingGroupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  await prisma.trainingGroup.create({ data: parsed.data });
  revalidatePath("/[locale]/about", "page");
  revalidatePath("/[locale]/admin/club", "page");
  return redirect({ href: "/admin/club", locale });
}

export async function updateTrainingGroupAction(
  locale: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = TrainingGroupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  await prisma.trainingGroup.update({ where: { id }, data: parsed.data });
  revalidatePath("/[locale]/about", "page");
  revalidatePath("/[locale]/admin/club", "page");
  return { success: true };
}

export async function deleteTrainingGroupAction(locale: string, id: string): Promise<void> {
  const adminId = await requireAdminId();
  if (!adminId) return;
  await prisma.trainingGroup.delete({ where: { id } });
  revalidatePath("/[locale]/about", "page");
  revalidatePath("/[locale]/admin/club", "page");
  redirect({ href: "/admin/club", locale });
}
