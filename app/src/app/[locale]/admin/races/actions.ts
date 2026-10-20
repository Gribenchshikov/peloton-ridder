"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { revalidatePath } from "next/cache";

import { slugify } from "@/lib/slugify";

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
  isChallenge: z.preprocess((v) => v === "on", z.boolean()),
  isMass: z.preprocess((v) => v === "on", z.boolean()),
}).refine((d) => !(d.isChallenge && d.isMass), { message: "invalid_kind" });

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
    isChallenge: formData.get("isChallenge"),
    isMass: formData.get("isMass"),
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
    isChallenge: formData.get("isChallenge"),
    isMass: formData.get("isMass"),
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

export type RaceDangerState = { error?: string; cleared?: boolean };

async function raceHasLinkedData(raceId: string): Promise<boolean> {
  const [events, seriesLinks] = await Promise.all([
    prisma.event.count({ where: { raceId } }),
    prisma.seriesRace.count({ where: { raceId } }),
  ]);
  return events > 0 || seriesLinks > 0;
}

/** События трассы и всё, что на них ссылается: регистрации, трансфер, оплаты, дистанции, результаты. */
async function deleteLinkedRaceData(raceId: string) {
  await prisma.$transaction(async (tx) => {
    const events = await tx.event.findMany({ where: { raceId }, select: { id: true } });
    const registrationWhere = { registration: { event: { raceId } } };

    await tx.challengeActivity.deleteMany({ where: registrationWhere });
    await tx.registrationMerch.deleteMany({ where: registrationWhere });
    await tx.refundRequest.deleteMany({ where: registrationWhere });
    await tx.result.deleteMany({ where: { event: { raceId } } });
    await tx.registration.deleteMany({ where: { event: { raceId } } });
    await tx.waitlist.deleteMany({ where: { event: { raceId } } });
    await tx.notification.deleteMany({ where: { event: { raceId } } });
    await tx.volunteerApplication.deleteMany({ where: { event: { raceId } } });
    await tx.eventPartner.deleteMany({ where: { event: { raceId } } });
    await tx.promoCode.deleteMany({ where: { event: { raceId } } });
    await tx.merchItem.deleteMany({ where: { event: { raceId } } });
    await tx.distance.deleteMany({ where: { event: { raceId } } });
    if (events.length > 0) {
      await tx.siteSetting.deleteMany({
        where: { key: { in: events.map((event) => `report_financials_${event.id}`) } },
      });
    }
    await tx.event.deleteMany({ where: { raceId } });
    await tx.seriesRace.deleteMany({ where: { raceId } });
  }, { timeout: 30_000 });
}

function revalidateRace(id: string) {
  revalidatePath("/admin/races");
  revalidatePath(`/admin/races/${id}`);
  revalidatePath("/admin/events");
  revalidatePath("/admin");
}

export async function clearRaceDataAction(
  id: string,
  _prev: RaceDangerState,
  _formData: FormData,
): Promise<RaceDangerState> {
  void _prev;
  void _formData;
  if (!(await requireAdminId())) return { error: "unauthorized" };

  const race = await prisma.race.findUnique({ where: { id }, select: { id: true } });
  if (!race) return { error: "not_found" };

  await deleteLinkedRaceData(id);
  revalidateRace(id);
  return { cleared: true };
}

export async function deleteRaceAction(
  id: string,
  locale: string,
  _prev: RaceDangerState,
  _formData: FormData,
): Promise<RaceDangerState> {
  void _prev;
  void _formData;
  if (!(await requireAdminId())) return { error: "unauthorized" };

  if (await raceHasLinkedData(id)) return { error: "hasLinkedData" };

  try {
    await prisma.race.delete({ where: { id } });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2003" || (e as { code?: string }).code === "P2025") {
      return { error: (e as { code?: string }).code === "P2025" ? "not_found" : "hasLinkedData" };
    }
    throw e;
  }

  revalidatePath("/admin/races");
  revalidatePath("/admin");
  redirect({ href: "/admin/races", locale });
  return {};
}
