"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { saveFile } from "@/lib/storage";

const emptyToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

const httpUrl = z.string().trim().url().refine(
  (v) => { try { return ["http:", "https:"].includes(new URL(v).protocol); } catch { return false; } },
  { message: "must be http(s) URL" },
);

const PartnerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  websiteUrl: z.preprocess(emptyToUndefined, httpUrl.optional()),
});

export type ActionState = { error?: string; success?: boolean };

async function extractLogoUrl(
  formData: FormData,
  existing: string | null | undefined,
): Promise<{ logoUrl: string } | { error: string }> {
  const file = formData.get("logoFile");
  if (file instanceof File && file.size > 0) {
    const result = await saveFile(file, "logos");
    if ("error" in result) return { error: result.error };
    return { logoUrl: result.url };
  }
  const kept = formData.get("currentLogoUrl");
  const url = typeof kept === "string" && kept ? kept : (existing ?? "");
  if (!url) return { error: "logoRequired" };
  return { logoUrl: url };
}

export async function createPartnerAction(
  locale: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const logoResult = await extractLogoUrl(formData, null);
  if ("error" in logoResult) return { error: logoResult.error };

  const parsed = PartnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  await prisma.partner.create({ data: { ...parsed.data, logoUrl: logoResult.logoUrl } });
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

  const existing = await prisma.partner.findUnique({ where: { id }, select: { logoUrl: true } });
  const logoResult = await extractLogoUrl(formData, existing?.logoUrl);
  if ("error" in logoResult) return { error: logoResult.error };

  const parsed = PartnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  await prisma.partner.update({ where: { id }, data: { ...parsed.data, logoUrl: logoResult.logoUrl } });
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
