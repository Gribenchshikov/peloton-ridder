"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, isUniqueConstraintError } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { saveFile } from "@/lib/storage";
import { parseGpx } from "@/lib/gpxParser";
import type { AidStation } from "@/types/aidStation";

const emptyToUndefined = (value: unknown) => (value === "" || value == null ? undefined : value);

// z.string().url() only checks that the value parses as a URL — it happily accepts
// javascript: URIs, which these fields render as real <a href> links on public pages.
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

const EventFieldsSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  dateISO: z.coerce.date(),
  location: z.string().trim().min(1).max(200),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "COMPLETED"]),
  registrationDeadline: z.coerce.date(),
  cancellationDeadline: z.coerce.date(),
  medicalCancellationDeadline: z.coerce.date(),
  transferPrice: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  resultsUrl: z.preprocess(emptyToUndefined, httpUrlSchema.optional()),
  volunteerChatUrl: z.preprocess(emptyToUndefined, httpUrlSchema.optional()),
  // coverImageUrl обрабатывается отдельно через saveFile (file upload), не через Zod
});

const CreateEventSchema = EventFieldsSchema.extend({
  raceId: z.string().min(1),
});

const DistanceFieldsSchema = z
  .object({
    discipline: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    name: z.string().trim().min(1).max(100),
    km: z.coerce.number().positive(),
    gain: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    price: z.coerce.number().int().min(0),
    maxSlots: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
    minAge: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(120).optional()),
    maxAge: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(120).optional()),
    cutoffMinutes: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    requiresQualification: z.preprocess((v) => v === "on", z.boolean()),
    qualificationNote: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
    requiresInsurance: z.preprocess((v) => v === "on", z.boolean()),
    bibRangeStart: z.coerce.number().int().min(0),
    bibRangeEnd: z.coerce.number().int().min(0),
  })
  .refine((d) => d.bibRangeEnd >= d.bibRangeStart, { path: ["bibRangeEnd"], message: "bibRange" });

const MerchItemFieldsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  requiresSize: z.preprocess((v) => v === "on", z.boolean()),
  order: z.coerce.number().int().min(0).max(9999),
});

export type ActionState = { error?: string; success?: boolean; eventId?: string; invalidFields?: string[] };

function parseFormData<T>(schema: z.ZodType<T>, formData: FormData): { data: T } | { error: "invalid"; invalidFields: string[] } {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const invalidFields = [...new Set(parsed.error.issues.map((i) => String(i.path[0])).filter(Boolean))];
    return { error: "invalid", invalidFields };
  }
  return { data: parsed.data };
}

async function extractCoverUrl(formData: FormData, existing: string | null | undefined): Promise<{ coverImageUrl: string | null } | { error: string }> {
  const file = formData.get("coverImage");
  if (file instanceof File && file.size > 0) {
    const result = await saveFile(file, "events");
    if ("error" in result) return { error: result.error };
    return { coverImageUrl: result.url };
  }
  const kept = formData.get("currentCoverImageUrl");
  return { coverImageUrl: typeof kept === "string" && kept ? kept : (existing ?? null) };
}

export async function createEventAction(_locale: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const coverResult = await extractCoverUrl(formData, null);
  if ("error" in coverResult) return { error: coverResult.error };

  const parsed = parseFormData(CreateEventSchema, formData);
  if ("error" in parsed) return parsed;

  let eventId: string;
  try {
    const event = await prisma.event.create({ data: { ...parsed.data, ...coverResult } });
    eventId = event.id;
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: "duplicate" };
    throw err;
  }

  return { eventId };
}

export async function updateEventAction(eventId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const coverResult = await extractCoverUrl(formData, null);
  if ("error" in coverResult) return { error: coverResult.error };

  const parsed = parseFormData(EventFieldsSchema, formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.event.update({ where: { id: eventId }, data: { ...parsed.data, ...coverResult } });
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: "duplicate" };
    throw err;
  }

  revalidatePath("/[locale]/admin/events/[id]", "page");
  return { success: true };
}

export async function createDistanceAction(eventId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parseFormData(DistanceFieldsSchema, formData);
  if ("error" in parsed) return parsed;

  await prisma.distance.create({ data: { ...parsed.data, eventId } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  return { success: true };
}

export async function updateDistanceAction(
  distanceId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parseFormData(DistanceFieldsSchema, formData);
  if ("error" in parsed) return parsed;

  await prisma.distance.update({ where: { id: distanceId }, data: parsed.data });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  return { success: true };
}

export async function createMerchAction(eventId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parseFormData(MerchItemFieldsSchema, formData);
  if ("error" in parsed) return parsed;

  await prisma.merchItem.create({ data: { ...parsed.data, eventId } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  return { success: true };
}

export async function updateMerchAction(
  merchItemId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parseFormData(MerchItemFieldsSchema, formData);
  if ("error" in parsed) return parsed;

  await prisma.merchItem.update({ where: { id: merchItemId }, data: parsed.data });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  return { success: true };
}

export async function deleteMerchAction(
  merchItemId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _prevState;
  void _formData;

  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  await prisma.merchItem.delete({ where: { id: merchItemId } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  return { success: true };
}

export async function uploadTrackAction(
  distanceId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const file = formData.get("gpxFile");
  if (!(file instanceof File) || file.size === 0) return { error: "invalid" };

  if (file.size > 20 * 1024 * 1024) return { error: "tooLarge" };

  const text = await file.text();
  const profileData = parseGpx(text);
  if (!profileData) return { error: "invalidGpx" };

  await prisma.distance.update({
    where: { id: distanceId },
    data: { profileData: profileData as object },
  });

  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

const AidStationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  km: z.coerce.number().min(0).max(9999),
  type: z.enum(["water", "food", "checkpoint"]),
  cutoffMinutes: z.coerce.number().int().min(0).optional(),
});

export async function updateRaceStartAction(
  distanceId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const raw = formData.get("raceStartMinutes");
  const minutes = raw === "" || raw == null ? null : Number(raw);
  if (minutes !== null && (isNaN(minutes) || minutes < 0 || minutes >= 1440)) return { error: "invalid" };

  await prisma.distance.update({
    where: { id: distanceId },
    data: { raceStartMinutes: minutes },
  });

  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

export async function updateAidStationsAction(
  distanceId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const raw = formData.get("aidStations");
  if (typeof raw !== "string") return { error: "invalid" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "invalid" };
  }

  const result = z.array(AidStationSchema).safeParse(parsed);
  if (!result.success) return { error: "invalid" };

  await prisma.distance.update({
    where: { id: distanceId },
    data: { aidStations: result.data as AidStation[] },
  });

  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

export async function deleteDistanceAction(
  distanceId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  // Сигнатура нужна useActionState, хотя сами предыдущий state и FormData для
  // удаления дистанции не используются.
  void _prevState;
  void _formData;

  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  // Дистанция может уже иметь брони/лист ожидания — молчаливое удаление осиротило бы
  // Registration/Waitlist записи (distanceId стал бы указывать в никуда). Существование,
  // а не количество, поэтому findFirst вместо count — не считаем лишнего.
  const [hasRegistration, hasWaitlistEntry] = await Promise.all([
    prisma.registration.findFirst({ where: { distanceId }, select: { id: true } }),
    prisma.waitlist.findFirst({ where: { distanceId }, select: { id: true } }),
  ]);
  if (hasRegistration || hasWaitlistEntry) {
    return { error: "hasRegistrations" };
  }

  await prisma.distance.delete({ where: { id: distanceId } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  return { success: true };
}
