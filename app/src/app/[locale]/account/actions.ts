"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { safeRelativePath } from "@/lib/safeRedirect";

const ProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
  city: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
});

export type ProfileState = {
  error?: string;
  success?: boolean;
};

export async function updateProfileAction(
  locale: string,
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const userId = await requireUserId();
  if (!userId) {
    return { error: "unauthorized" };
  }

  const parsed = ProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
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

  // Если сюда пришли по ссылке «Изменить» с другой страницы (например, со страницы
  // регистрации на забег) — после сохранения возвращаем туда, а не оставляем на /account.
  const callbackUrl = safeRelativePath(formData.get("callbackUrl"));
  if (callbackUrl) {
    return redirect({ href: callbackUrl, locale });
  }

  revalidatePath("/[locale]/account", "page");
  return { success: true };
}
