"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export type PromoCheckResult =
  | { valid: false; error: "not_found" | "inactive" | "expired" | "exhausted" | "wrong_event" }
  | { valid: true };

export async function checkPromoAction(code: string, eventId: string): Promise<PromoCheckResult> {
  const ip = clientIp(await headers());
  if (!rateLimit(`promo:${ip}`, 20, 10 * 60 * 1000)) return { valid: false, error: "not_found" };
  if (!code.trim()) return { valid: false, error: "not_found" };

  const promo = await prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!promo) return { valid: false, error: "not_found" };
  if (!promo.active) return { valid: false, error: "inactive" };
  if (promo.expiresAt && promo.expiresAt < new Date()) return { valid: false, error: "expired" };
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return { valid: false, error: "exhausted" };
  if (promo.eventId !== null && promo.eventId !== eventId) return { valid: false, error: "wrong_event" };

  return { valid: true };
}
