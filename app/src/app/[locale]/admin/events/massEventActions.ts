"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, isUniqueConstraintError } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { saveFile } from "@/lib/storage";
import { slugify } from "@/lib/slugify";

export type MassActionState = { error?: string; success?: boolean; eventId?: string };

const emptyToUndefined = (value: unknown) => (value === "" || value == null ? undefined : value);

const httpUrlSchema = z.string().trim().url().refine(
  (value) => {
    try {
      return ["http:", "https:"].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  },
  { message: "must be an http(s) URL" },
);

const MassEventSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  dateISO: z.coerce.date(),
  location: z.string().trim().min(1).max(200),
  locationUrl: z.preprocess(emptyToUndefined, httpUrlSchema.optional()),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "COMPLETED"]),
  isFeatured: z.preprocess((v) => v === "on", z.boolean()),
});

async function extractCoverUrl(
  formData: FormData,
  existing: string | null | undefined,
): Promise<{ coverImageUrl: string | null } | { error: string }> {
  const file = formData.get("coverImage");
  if (file instanceof File && file.size > 0) {
    const result = await saveFile(file, "events");
    if ("error" in result) return { error: result.error };
    return { coverImageUrl: result.url };
  }
  const kept = formData.get("currentCoverImageUrl");
  return { coverImageUrl: typeof kept === "string" && kept ? kept : (existing ?? null) };
}

async function uniqueSlug(base: string): Promise<string> {
  const root = base.length >= 2 ? base : "meropriyatie";
  let candidate = root;
  let n = 2;
  while (await prisma.race.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${root}-${n++}`;
  }
  return candidate;
}

async function resolveMassRace(formData: FormData): Promise<{ raceId: string } | { error: string }> {
  const raceId = String(formData.get("raceId") ?? "").trim();
  if (raceId) {
    const race = await prisma.race.findUnique({ where: { id: raceId }, select: { id: true, isMass: true } });
    if (!race?.isMass) return { error: "invalid" };
    return { raceId: race.id };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 100) return { error: "invalid" };

  const existing = await prisma.race.findFirst({ where: { name, isMass: true }, select: { id: true } });
  if (existing) return { raceId: existing.id };

  const slug = await uniqueSlug(slugify(name));
  const created = await prisma.race.create({
    data: {
      name,
      slug,
      courseIntro: "",
      equipment: [],
      landmarks: [],
      icon: "i-route",
      color: "#3d5a40",
      isChallenge: false,
      isMass: true,
    },
  });
  return { raceId: created.id };
}

export async function createMassEventAction(
  _locale: string,
  _prevState: MassActionState,
  formData: FormData,
): Promise<MassActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const coverResult = await extractCoverUrl(formData, null);
  if ("error" in coverResult) return { error: coverResult.error };

  const parsed = MassEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  const race = await resolveMassRace(formData);
  if ("error" in race) return race;

  try {
    const event = await prisma.event.create({
      data: {
        ...parsed.data,
        raceId: race.raceId,
        registrationDeadline: parsed.data.dateISO,
        cancellationDeadline: parsed.data.dateISO,
        medicalCancellationDeadline: parsed.data.dateISO,
        ...coverResult,
      },
    });
    revalidatePath("/[locale]/admin", "page");
    revalidatePath("/[locale]/events", "page");
    return { eventId: event.id };
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: "duplicate" };
    throw err;
  }
}

export async function updateMassEventAction(
  eventId: string,
  _prevState: MassActionState,
  formData: FormData,
): Promise<MassActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const existing = await prisma.event.findUnique({
    where: { id: eventId },
    select: { coverImageUrl: true, race: { select: { isMass: true } } },
  });
  if (!existing?.race.isMass) return { error: "invalid" };

  const coverResult = await extractCoverUrl(formData, existing.coverImageUrl);
  if ("error" in coverResult) return { error: coverResult.error };

  const parsed = MassEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  const name = String(formData.get("name") ?? "").trim();

  const event = await prisma.event.update({
    where: { id: eventId },
    data: { ...parsed.data, ...coverResult },
    select: { raceId: true },
  });

  if (name.length >= 2) {
    await prisma.race.update({ where: { id: event.raceId }, data: { name } });
  }

  revalidatePath(`/[locale]/admin/events/${eventId}`, "page");
  revalidatePath("/[locale]/admin", "page");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/events", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}
