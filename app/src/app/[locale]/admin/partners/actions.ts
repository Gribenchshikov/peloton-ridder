"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";

const emptyToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

const httpUrl = z.string().trim().url().refine(
  (v) => { try { return ["http:", "https:"].includes(new URL(v).protocol); } catch { return false; } },
  { message: "must be http(s) URL" },
);

const PartnerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  logoUrl: httpUrl,
  websiteUrl: z.preprocess(emptyToUndefined, httpUrl.optional()),
});

export type ActionState = { error?: string; success?: boolean };

export async function createPartnerAction(
  locale: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };
  const parsed = PartnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  await prisma.partner.create({ data: parsed.data });
  revalidatePath("/[locale]/admin/partners", "page");
  return redirect({ href: "/admin/partners", locale });
}

export async function updatePartnerAction(
  locale: string,
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };
  const parsed = PartnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  await prisma.partner.update({ where: { id }, data: parsed.data });
  revalidatePath("/[locale]/admin/partners", "page");
  return { success: true };
}

export async function deletePartnerAction(locale: string, id: string): Promise<void> {
  const adminId = await requireAdminId();
  if (!adminId) return;
  await prisma.partner.delete({ where: { id } });
  revalidatePath("/[locale]/admin/partners", "page");
  redirect({ href: "/admin/partners", locale });
}

export async function linkPartnerAction(eventId: string, partnerId: string): Promise<void> {
  const adminId = await requireAdminId();
  if (!adminId) return;
  await prisma.eventPartner.upsert({
    where: { eventId_partnerId: { eventId, partnerId } },
    create: { eventId, partnerId },
    update: {},
  });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events", "page");
}

export async function unlinkPartnerAction(eventId: string, partnerId: string): Promise<void> {
  const adminId = await requireAdminId();
  if (!adminId) return;
  await prisma.eventPartner.delete({ where: { eventId_partnerId: { eventId, partnerId } } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events", "page");
}
