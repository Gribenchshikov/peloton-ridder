"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { revalidatePath } from "next/cache";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const RaceSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Только строчные латинские буквы, цифры и дефис"),
  courseIntro: z.string().max(2000).optional().default(""),
  icon: z.string().max(20).optional().default("i-mountain"),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .default("#e87040"),
});

export type RaceFormState = { error?: string; fieldErrors?: Record<string, string[]>; saved?: boolean };

export async function createRaceAction(
  locale: string,
  _prev: RaceFormState,
  formData: FormData,
): Promise<RaceFormState> {
  if (!(await requireAdminId())) return { error: "unauthorized" };

  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug") || slugify(String(formData.get("name") ?? "")),
    courseIntro: formData.get("courseIntro"),
    icon: formData.get("icon") || "i-mountain",
    color: formData.get("color") || "#e87040",
  };

  const parsed = RaceSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const race = await prisma.race.create({
      data: { ...parsed.data, equipment: [], landmarks: [] },
    });
    revalidatePath("/admin/races");
    return redirect({ href: "/admin/races", locale });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "duplicate_slug" };
    throw e;
  }
}

export async function updateRaceAction(
  id: string,
  _prev: RaceFormState,
  formData: FormData,
): Promise<RaceFormState> {
  if (!(await requireAdminId())) return { error: "unauthorized" };

  const raw = {
    name: formData.get("name"),
    slug: formData.get("slug"),
    courseIntro: formData.get("courseIntro"),
    icon: formData.get("icon") || "i-mountain",
    color: formData.get("color") || "#e87040",
  };

  const parsed = RaceSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    await prisma.race.update({ where: { id }, data: parsed.data });
    revalidatePath("/admin/races");
    revalidatePath(`/admin/races/${id}`);
    return { saved: true };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "duplicate_slug" };
    throw e;
  }
}
