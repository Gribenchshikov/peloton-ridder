"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const ProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
});

export type ProfileState = {
  error?: string;
  success?: boolean;
};

export async function updateProfileAction(_prevState: ProfileState, formData: FormData): Promise<ProfileState> {
  const userId = await requireUserId();
  if (!userId) {
    return { error: "unauthorized" };
  }

  const parsed = ProfileSchema.safeParse({
    name: formData.get("name"),
    city: formData.get("city") || undefined,
    phone: formData.get("phone") || undefined,
  });

  if (!parsed.success) {
    return { error: "invalid" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: parsed.data,
  });

  revalidatePath("/[locale]/account", "page");
  return { success: true };
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
