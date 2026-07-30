"use server";

import { requireAdminId } from "@/lib/session";
import { upsertSiteSetting, getSiteSetting } from "@/lib/queries";
import { saveFile } from "@/lib/storage";

export async function saveHeroBgAction(formData: FormData) {
  const adminId = await requireAdminId();
  if (!adminId) throw new Error("Unauthorized");

  const file = formData.get("file") as File | null;

  if (file && file.size > 0) {
    const result = await saveFile(file, "site");
    if ("error" in result) return { error: result.error };
    await upsertSiteSetting("hero_bg_url", result.url);
    return { url: result.url };
  }

  return { error: "noFile" as const };
}

export async function removeHeroBgAction() {
  const adminId = await requireAdminId();
  if (!adminId) throw new Error("Unauthorized");
  await upsertSiteSetting("hero_bg_url", "");
  return { ok: true };
}

export async function getHeroBgAction() {
  const adminId = await requireAdminId();
  if (!adminId) throw new Error("Unauthorized");
  return getSiteSetting("hero_bg_url");
}

export async function saveSizeTableAction(json: string) {
  const adminId = await requireAdminId();
  if (!adminId) throw new Error("Unauthorized");
  await upsertSiteSetting("tshirt_size_table", json);
  return { ok: true };
}

export type StatItem = { value: string; label: string };

export async function saveHomeStatsAction(stats: StatItem[]) {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };
  if (!Array.isArray(stats) || stats.length !== 4) return { error: "invalid" };
  await upsertSiteSetting("home_stats", JSON.stringify(stats));
  return { ok: true };
}

export type ContactInfo = { phone1: string; phone2: string; email: string };

export async function saveContactInfoAction(info: ContactInfo) {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };
  await upsertSiteSetting("contact_info", JSON.stringify(info));
  return { ok: true };
}

export type PartnershipContent = {
  heroTitle: string;
  heroEmphasis: string;
  heroSubtitle: string;
  stats: StatItem[];
  sponsorsIntro: string;
  partnersIntro: string;
};

export async function savePartnershipContentAction(content: PartnershipContent) {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };
  if (!Array.isArray(content.stats) || content.stats.length !== 4) return { error: "invalid" };
  await upsertSiteSetting("partnership_content", JSON.stringify(content));
  return { ok: true };
}

const ALLOWED_BG_PAGES = ["partnership", "volunteer", "about", "contact"] as const;
type BgPage = (typeof ALLOWED_BG_PAGES)[number];

export async function savePageBgAction(page: string, formData: FormData) {
  const adminId = await requireAdminId();
  if (!adminId) throw new Error("Unauthorized");
  if (!ALLOWED_BG_PAGES.includes(page as BgPage)) throw new Error("Invalid page");
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "noFile" as const };
  const result = await saveFile(file, "site");
  if ("error" in result) return { error: result.error };
  await upsertSiteSetting(`bg_${page}`, result.url);
  return { url: result.url };
}

export async function removePageBgAction(page: string) {
  const adminId = await requireAdminId();
  if (!adminId) throw new Error("Unauthorized");
  if (!ALLOWED_BG_PAGES.includes(page as BgPage)) throw new Error("Invalid page");
  await upsertSiteSetting(`bg_${page}`, "");
  return { ok: true };
}
