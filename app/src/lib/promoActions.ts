"use server";

import { prisma } from "@/lib/prisma";

export type PromoCheckResult =
  | { valid: false; error: "not_found" | "inactive" | "expired" | "exhausted" | "wrong_event" }
  | { valid: true; promoId: string; discountType: "PERCENT" | "FIXED"; discountValue: number };

export async function checkPromoAction(code: string, eventId: string): Promise<PromoCheckResult> {
  if (!code.trim()) return { valid: false, error: "not_found" };

  const promo = await prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!promo) return { valid: false, error: "not_found" };
  if (!promo.active) return { valid: false, error: "inactive" };
  if (promo.expiresAt && promo.expiresAt < new Date()) return { valid: false, error: "expired" };
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return { valid: false, error: "exhausted" };
  if (promo.eventId !== null && promo.eventId !== eventId) return { valid: false, error: "wrong_event" };

  return { valid: true, promoId: promo.id, discountType: promo.discountType, discountValue: promo.discountValue };
}
