"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, isUniqueConstraintError } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";

export type ActionState = { error?: string; success?: boolean };

const SeriesFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
});

function parseFormData(formData: FormData) {
  const raw: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") raw[k] = v;
  }
  const parsed = SeriesFieldsSchema.safeParse(raw);
  if (!parsed.success) return { error: "invalid" as const };
  return { data: parsed.data };
}

function extractRaces(formData: FormData): { raceId: string; stageOrder: number }[] {
  const races: { raceId: string; stageOrder: number }[] = [];
  for (const [key, value] of formData.entries()) {
    const match = /^race_(\w+)$/.exec(key);
    if (match && value === "on") {
      const orderRaw = formData.get(`order_${match[1]}`);
      const stageOrder = orderRaw ? parseInt(String(orderRaw), 10) : 99;
      races.push({ raceId: match[1], stageOrder: isNaN(stageOrder) ? 99 : stageOrder });
    }
  }
  return races.sort((a, b) => a.stageOrder - b.stageOrder);
}

export async function createSeriesAction(locale: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parseFormData(formData);
  if ("error" in parsed) return parsed;

  const races = extractRaces(formData);

  let seriesId: string;
  try {
    const series = await prisma.series.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        seriesRaces: { create: races },
      },
    });
    seriesId = series.id;
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: "duplicate" };
    throw err;
  }

  revalidatePath("/[locale]", "page");
  redirect({ href: `/admin/series/${seriesId}`, locale });
  return {};
}

export async function updateSeriesAction(seriesId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parseFormData(formData);
  if ("error" in parsed) return parsed;

  const races = extractRaces(formData);

  await prisma.$transaction(async (tx) => {
    await tx.seriesRace.deleteMany({ where: { seriesId } });
    await tx.series.update({
      where: { id: seriesId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        seriesRaces: { create: races },
      },
    });
  });

  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/admin/series/[id]", "page");
  return { success: true };
}

export async function deleteSeriesAction(locale: string, seriesId: string, _prev: ActionState, _formData: FormData): Promise<ActionState> {
  void _prev;
  void _formData;

  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  await prisma.$transaction(async (tx) => {
    await tx.seriesRace.deleteMany({ where: { seriesId } });
    await tx.series.delete({ where: { id: seriesId } });
  });

  revalidatePath("/[locale]", "page");
  redirect({ href: "/admin/series", locale });
  return {};
}
