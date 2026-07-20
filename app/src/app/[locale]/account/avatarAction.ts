"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";

export type AvatarState = { error?: string; url?: string };

export async function uploadAvatarAction(_prev: AvatarState, formData: FormData): Promise<AvatarState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "unauthorized" };

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "missing" };
  if (file.size > 5 * 1024 * 1024) return { error: "tooLarge" };

  const result = await saveFile(file, "avatars");
  if ("error" in result) return { error: result.error };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: result.url },
  });

  revalidatePath("/[locale]/account", "page");
  return { url: result.url };
}
