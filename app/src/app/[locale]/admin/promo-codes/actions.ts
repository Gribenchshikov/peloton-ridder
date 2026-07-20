"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";

export type ActionState = { error?: string; success?: boolean };

const PromoSchema = z.object({
  code: z.string().trim().min(1).max(50).toUpperCase(),
  discountType: z.enum(["PERCENT", "FIXED"]),
  discountValue: z.coerce.number().int().min(1).max(100_000),
  maxUses: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(1).nullable()),
  expiresAt: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.date().nullable()),
  eventId: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().nullable()),
  active: z.preprocess((v) => v === "on", z.boolean()),
});

function parse(fd: FormData) {
  const parsed = PromoSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "invalid" as const };
  return { data: parsed.data };
}

export async function createPromoAction(locale: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parse(fd);
  if ("error" in parsed) return parsed;

  try {
    await prisma.promoCode.create({ data: parsed.data });
    revalidatePath("/[locale]/admin/promo-codes", "page");
    return { success: true };
  } catch {
    return { error: "duplicate" };
  }
}

export async function updatePromoAction(promoId: string, _p: ActionState, fd: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parse(fd);
  if ("error" in parsed) return parsed;

  try {
    await prisma.promoCode.update({ where: { id: promoId }, data: parsed.data });
  } catch {
    return { error: "duplicate" };
  }

  revalidatePath("/[locale]/admin/promo-codes", "page");
  revalidatePath("/[locale]/admin/promo-codes/[id]", "page");
  return { success: true };
}

export async function deletePromoAction(locale: string, promoId: string, _p: ActionState, _fd: FormData): Promise<ActionState> {
  void _p; void _fd;

  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  await prisma.promoCode.delete({ where: { id: promoId } });
  revalidatePath("/[locale]/admin/promo-codes", "page");
  redirect({ href: "/admin/promo-codes", locale });
  return {};
}
