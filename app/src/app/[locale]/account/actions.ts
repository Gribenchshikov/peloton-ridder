"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { safeRelativePath } from "@/lib/safeRedirect";
import { CancelReason } from "@/generated/prisma/client";

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

const VALID_CANCEL_REASONS = Object.values(CancelReason);

export type CancelRegistrationState = { error?: string; success?: boolean };

export async function userCancelRegistrationAction(
  _prevState: CancelRegistrationState,
  formData: FormData,
): Promise<CancelRegistrationState> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthorized" };

  const registrationId = formData.get("registrationId");
  const reason = formData.get("cancelReason");
  const comment = formData.get("cancelComment");

  if (typeof registrationId !== "string") return { error: "invalid" };
  if (typeof reason !== "string" || !VALID_CANCEL_REASONS.includes(reason as CancelReason)) return { error: "invalid_reason" };

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { userId: true, status: true, event: { select: { cancellationDeadline: true } } },
  });

  if (!reg || reg.userId !== userId) return { error: "not_found" };
  if (reg.status === "CANCELLED") return { error: "already_cancelled" };
  if (reg.status !== "RESERVED" && reg.status !== "PAID") return { error: "inactive" };
  if (new Date() > reg.event.cancellationDeadline) return { error: "deadline_passed" };

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: "CANCELLED",
      reservedUntil: null,
      bibNumber: null,
      cancelReason: reason as CancelReason,
      cancelComment: typeof comment === "string" && comment.trim() ? comment.trim() : null,
    },
  });

  revalidatePath("/[locale]/account", "page");
  return { success: true };
}
