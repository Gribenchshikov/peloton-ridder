"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { saveFile } from "@/lib/storage";
import { syncTeamPhotosToStorage } from "@/lib/syncTeamPhotos";

const emptyToUndefined = (value: unknown) => (value === "" || value == null ? undefined : value);

const MemberSchema = z.object({
  name: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  bio: z.preprocess(emptyToUndefined, z.string().trim().max(1000).optional()),
  type: z.enum(["TEAM", "VOLUNTEER"]),
  order: z.coerce.number().int().min(0).max(9999),
});

async function resolvePhoto(
  formData: FormData,
  existingUrl?: string | null,
): Promise<{ photoUrl?: string | null; error?: string }> {
  const file = formData.get("photo") as File | null;
  const remove = formData.get("removePhoto") === "1";
  if (remove) return { photoUrl: null };
  if (file && file.size > 0) {
    const result = await saveFile(file, "team");
    if ("error" in result) return { error: result.error };
    return { photoUrl: result.url };
  }
  return { photoUrl: existingUrl ?? null };
}

export type ActionState = { error?: string; success?: boolean };
export type SyncTeamPhotosState = { error?: string; success?: boolean; uploaded?: number };

export async function syncTeamPhotosAction(
  _prev: SyncTeamPhotosState,
  _formData: FormData,
): Promise<SyncTeamPhotosState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const result = await syncTeamPhotosToStorage();
  if (result.uploaded === 0 && result.errors.length > 0) {
    return { error: result.errors[0] };
  }

  revalidatePath("/[locale]/about", "page");
  revalidatePath("/[locale]/admin/club", "page");
  return { success: true, uploaded: result.uploaded };
}

export async function createMemberAction(
  locale: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = MemberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  const photo = await resolvePhoto(formData, null);
  if (photo.error) return { error: photo.error };

  await prisma.teamMember.create({ data: { ...parsed.data, photoUrl: photo.photoUrl } });
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

  const existing = await prisma.teamMember.findUnique({ where: { id }, select: { photoUrl: true } });
  const photo = await resolvePhoto(formData, existing?.photoUrl);
  if (photo.error) return { error: photo.error };

  await prisma.teamMember.update({ where: { id }, data: { ...parsed.data, photoUrl: photo.photoUrl } });
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
