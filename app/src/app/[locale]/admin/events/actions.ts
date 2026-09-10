"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, isUniqueConstraintError } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { requireAdminId } from "@/lib/session";
import { saveFile } from "@/lib/storage";
import { parseGpx } from "@/lib/gpxParser";
import { redirect } from "@/i18n/navigation";
import type { AidStation } from "@/types/aidStation";
import type { RegulationFile, RegulationBlock } from "@/types/regulation";
import type { PhotoLink, DayProgramItem, DistanceEquipment } from "@/types/eventContent";
import { localDateSchema } from "@/lib/dates";

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
  dateISO: localDateSchema,
  location: z.string().trim().min(1).max(200),
  locationUrl: z.preprocess(emptyToUndefined, httpUrlSchema.optional()),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "COMPLETED"]),
  isFeatured: z.preprocess((v) => v === "on", z.boolean()),
  registrationDeadline: localDateSchema,
  cancellationDeadline: localDateSchema,
  medicalCancellationDeadline: localDateSchema,
  transferPrice: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  resultsUrl: z.preprocess(emptyToUndefined, httpUrlSchema.optional()),
  volunteerChatUrl: z.preprocess(emptyToUndefined, httpUrlSchema.optional()),
  challengeWindowEnd: z.preprocess(emptyToUndefined, localDateSchema.optional()),
  // coverImageUrl обрабатывается отдельно через saveFile (file upload), не через Zod
});

const CreateEventSchema = EventFieldsSchema.extend({
  raceId: z.string().min(1),
});

const DistanceFieldsSchema = z
  .object({
    discipline: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    name: z.string().trim().min(1).max(100),
    km: z.coerce.number().min(0),
    gain: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    price: z.coerce.number().int().min(0),
    maxSlots: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
    participantsPerSlot: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(10).optional().default(1)),
    participantRulesJson: z.preprocess(emptyToUndefined, z.string().optional()),
    minAge: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(120).optional()),
    maxAge: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(120).optional()),
    cutoffMinutes: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    certification: z.preprocess(emptyToUndefined, z.string().trim().max(50).optional()),
    certificationPoints: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    requiresQualification: z.preprocess((v) => v === "on", z.boolean()),
    qualificationNote: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
    requiresInsurance: z.preprocess((v) => v === "on", z.boolean()),
    bibRangeStart: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    bibRangeEnd: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
  })
  .refine((d) => d.bibRangeStart === undefined || d.bibRangeEnd === undefined || d.bibRangeEnd >= d.bibRangeStart, { path: ["bibRangeEnd"], message: "bibRange" });

const MerchItemFieldsSchema = z.object({
  name: z.string().trim().min(1).max(100),
  requiresSize: z.preprocess((v) => v === "on", z.boolean()),
  order: z.coerce.number().int().min(0).max(9999),
});

export type ActionState = { error?: string; success?: boolean; eventId?: string; invalidFields?: string[]; url?: string };

function asRegulationFiles(value: unknown): RegulationFile[] {
  if (Array.isArray(value)) return value as RegulationFile[];
  if (value && typeof value === "object" && "url" in value) return [value as RegulationFile];
  return [];
}

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

  const race = await prisma.race.findUnique({
    where: { id: parsed.data.raceId },
    select: { isMass: true, isChallenge: true },
  });
  if (!race || race.isMass || race.isChallenge) return { error: "invalid" };

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

  const raceName = (formData.get("raceName") as string | null)?.trim() || null;
  const newRaceId = (formData.get("raceId") as string | null)?.trim() || null;

  if (newRaceId) {
    const race = await prisma.race.findUnique({
      where: { id: newRaceId },
      select: { isMass: true, isChallenge: true },
    });
    if (!race || race.isMass || race.isChallenge) return { error: "invalid" };
  }

  try {
    const event = await prisma.event.update({
      where: { id: eventId },
      data: { ...parsed.data, ...coverResult, ...(newRaceId ? { raceId: newRaceId } : {}) },
      select: { raceId: true, year: true, race: { select: { slug: true } } },
    });
    const targetRaceId = newRaceId ?? event.raceId;
    if (raceName) {
      await prisma.race.update({ where: { id: targetRaceId }, data: { name: raceName } });
    }
    revalidatePath(`/[locale]/events/${event.race.slug}/${event.year}`, "page");
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: "duplicate" };
    throw err;
  }

  revalidatePath(`/[locale]/admin/events/${eventId}`, "page");
  revalidatePath("/[locale]/admin", "page");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/events", "page");
  return { success: true };
}

function extractParticipantRules(data: Record<string, unknown> & { participantRulesJson?: string; participantsPerSlot?: number }) {
  const { participantRulesJson, participantsPerSlot, ...rest } = data;
  let participantRules: Prisma.InputJsonValue | typeof Prisma.DbNull = Prisma.DbNull;
  if (participantsPerSlot && participantsPerSlot > 1 && participantRulesJson) {
    try { participantRules = JSON.parse(participantRulesJson); } catch { /* ignore */ }
  }
  return { ...rest, participantsPerSlot: participantsPerSlot ?? 1, participantRules };
}

export async function createDistanceAction(eventId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parseFormData(DistanceFieldsSchema, formData);
  if ("error" in parsed) return parsed;

  const distanceData = extractParticipantRules(parsed.data);
  await prisma.distance.create({ data: { ...(distanceData as Prisma.DistanceUncheckedCreateInput), eventId } });
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

  const distanceData = extractParticipantRules(parsed.data);
  await prisma.distance.update({ where: { id: distanceId }, data: distanceData as Prisma.DistanceUncheckedUpdateInput });
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

  const saved = await saveFile(file, "gpx");
  const gpxUrl = "error" in saved ? null : saved.url;

  await prisma.distance.update({
    where: { id: distanceId },
    data: {
      profileData: profileData as object,
      ...(gpxUrl ? { gpxUrl } : {}),
    },
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

// ── Delete event ──────────────────────────────────────────────────────────────

export async function deleteEventAction(
  locale: string,
  eventId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const hasPaid = await prisma.registration.findFirst({
    where: { eventId, status: "PAID" },
    select: { id: true },
  });
  if (hasPaid) return { error: "hasRegistrations" };

  await prisma.$transaction(async (tx) => {
    await tx.registrationMerch.deleteMany({ where: { registration: { eventId } } });
    await tx.refundRequest.deleteMany({ where: { registration: { eventId } } });
    await tx.registration.deleteMany({ where: { eventId } });
    await tx.waitlist.deleteMany({ where: { eventId } });
    await tx.result.deleteMany({ where: { eventId } });
    await tx.notification.deleteMany({ where: { eventId } });
    await tx.volunteerApplication.deleteMany({ where: { eventId } });
    await tx.eventPartner.deleteMany({ where: { eventId } });
    await tx.merchItem.deleteMany({ where: { eventId } });
    await tx.distance.deleteMany({ where: { eventId } });
    await tx.event.delete({ where: { id: eventId } });
  });

  revalidatePath("/[locale]/admin", "page");
  redirect({ href: "/admin", locale });
  return {};
}

// ── Regulation files ─────────────────────────────────────────────────────────

export async function uploadRegulationFileAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const file = formData.get("file");
  const locale = formData.get("locale");
  const name = formData.get("name");
  if (!(file instanceof File) || file.size === 0) return { error: "invalid" };
  if (typeof locale !== "string" || !["ru", "kk", "en"].includes(locale)) return { error: "invalid" };

  const saved = await saveFile(file, "regulations");
  if ("error" in saved) return { error: saved.error };

  const displayName = typeof name === "string" && name.trim() ? name.trim().slice(0, 200) : file.name;

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { regulationFiles: true } });
  const existing = asRegulationFiles(event?.regulationFiles);
  const updated = [...existing, { locale, name: displayName, url: saved.url } as RegulationFile];

  await prisma.event.update({ where: { id: eventId }, data: { regulationFiles: updated } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true, url: saved.url };
}

export async function removeRegulationFileAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const url = formData.get("url");
  if (typeof url !== "string") return { error: "invalid" };

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { regulationFiles: true } });
  const existing = asRegulationFiles(event?.regulationFiles);
  const updated = existing.filter((f) => f.url !== url);

  await prisma.event.update({ where: { id: eventId }, data: { regulationFiles: updated } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

// ── Waiver files ─────────────────────────────────────────────────────────────

export async function uploadWaiverFileAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const file = formData.get("file");
  const locale = formData.get("locale");
  const name = formData.get("name");

  if (!(file instanceof File) || file.size === 0) return { error: "invalid" };
  if (typeof locale !== "string" || !["ru", "kk", "en"].includes(locale)) return { error: "invalid" };

  const saved = await saveFile(file, "waivers");
  if ("error" in saved) return { error: saved.error };

  const displayName = typeof name === "string" && name.trim() ? name.trim().slice(0, 200) : file.name;

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { waiverFiles: true } });
  const existing = asRegulationFiles(event?.waiverFiles);
  const updated = [...existing, { locale, name: displayName, url: saved.url } as RegulationFile];

  await prisma.event.update({ where: { id: eventId }, data: { waiverFiles: updated } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true, url: saved.url };
}

export async function removeWaiverFileAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const url = formData.get("url");
  if (typeof url !== "string") return { error: "invalid" };

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { waiverFiles: true } });
  const existing = asRegulationFiles(event?.waiverFiles);
  const updated = existing.filter((f) => f.url !== url);

  await prisma.event.update({ where: { id: eventId }, data: { waiverFiles: updated } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

// ── Regulation blocks ─────────────────────────────────────────────────────────

export async function updateRegulationBlocksAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const raw = formData.get("blocks");
  if (typeof raw !== "string") return { error: "invalid" };

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { error: "invalid" }; }

  const BlockSchema = z.array(z.object({
    id: z.string(),
    order: z.number().int(),
    title: z.object({ ru: z.string(), kk: z.string(), en: z.string() }),
    content: z.object({ ru: z.string(), kk: z.string(), en: z.string() }),
  }));
  const result = BlockSchema.safeParse(parsed);
  if (!result.success) return { error: "invalid" };

  await prisma.event.update({ where: { id: eventId }, data: { regulationBlocks: result.data as RegulationBlock[] } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

// ── About / О забеге ─────────────────────────────────────────────────────────

export async function updateAboutAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const aboutText = formData.get("aboutText");

  await prisma.event.update({
    where: { id: eventId },
    data: {
      aboutText: typeof aboutText === "string" ? aboutText || null : null,
    },
  });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

const MediaLinkSchema = z.object({
  url: httpUrlSchema,
  label: z.string().trim().min(1).max(80),
  coverUrl: z.string().trim().min(1).max(500).optional(),
  kind: z.enum(["photo", "video"]).optional(),
});

export async function updateMediaLinksAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const linksRaw = formData.get("photoLinks");
  let parsed: unknown = [];
  if (typeof linksRaw === "string" && linksRaw) {
    try { parsed = JSON.parse(linksRaw); } catch { return { error: "invalid" }; }
  }
  const result = z.array(MediaLinkSchema).safeParse(parsed);
  if (!result.success) return { error: "invalid" };

  const photoLinks: PhotoLink[] = result.data.map((link) => ({
    url: link.url,
    label: link.label,
    ...(link.coverUrl ? { coverUrl: link.coverUrl } : {}),
    kind: link.kind === "video" ? "video" : "photo",
  }));

  await prisma.event.update({
    where: { id: eventId },
    data: {
      photoLinks: photoLinks.length ? (photoLinks as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    },
  });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

export async function uploadPhotoLinkCoverAction(
  _eventId: string,
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const file = formData.get("cover");
  if (!(file instanceof File) || file.size === 0) return { error: "invalid" };

  const saved = await saveFile(file, "photo-covers");
  if ("error" in saved) return { error: saved.error };
  return { url: saved.url };
}

export async function uploadEventPhotoAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState & { url?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "invalid" };

  const saved = await saveFile(file, "event-photos");
  if ("error" in saved) return { error: saved.error };

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { eventPhotos: true } });
  const existing = (event?.eventPhotos as string[] | null) ?? [];
  const updated = [...existing, saved.url];

  await prisma.event.update({ where: { id: eventId }, data: { eventPhotos: updated } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true, url: saved.url };
}

export async function deleteEventPhotoAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const url = formData.get("url");
  if (typeof url !== "string") return { error: "invalid" };

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { eventPhotos: true } });
  const existing = (event?.eventPhotos as string[] | null) ?? [];
  const updated = existing.filter((u) => u !== url);

  await prisma.event.update({ where: { id: eventId }, data: { eventPhotos: updated.length ? updated : Prisma.DbNull } });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

// ── Day program / Программа дня ──────────────────────────────────────────────

export async function updateDayProgramAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const raw = formData.get("dayProgram");
  if (typeof raw !== "string") return { error: "invalid" };

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { error: "invalid" }; }

  const Schema = z.array(z.object({ time: z.string().max(20), description: z.string().max(500) }));
  const result = Schema.safeParse(parsed);
  if (!result.success) return { error: "invalid" };

  await prisma.event.update({
    where: { id: eventId },
    data: { dayProgram: result.data.length ? (result.data as unknown as Prisma.InputJsonValue) : Prisma.DbNull },
  });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

// ── How to get there / Как добраться ─────────────────────────────────────────

export async function updateHowToGetAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const text = formData.get("howToGet");
  const url = formData.get("howToGetUrl");
  await prisma.event.update({
    where: { id: eventId },
    data: {
      howToGet: typeof text === "string" ? text || null : null,
      howToGetUrl: typeof url === "string" ? url || null : null,
    },
  });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

// ── Equipment / Снаряжение ───────────────────────────────────────────────────

export async function updateDistanceEquipmentAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const raw = formData.get("distanceEquipment");
  if (typeof raw !== "string") return { error: "invalid" };

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { error: "invalid" }; }

  await prisma.event.update({
    where: { id: eventId },
    data: { distanceEquipment: parsed as DistanceEquipment },
  });
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}

// ── Results ────────────────────────────────────────────────────────────────────

export async function importItraResultsAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState & { count?: number }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "invalid" };
  if (file.size > 20 * 1024 * 1024) return { error: "tooLarge" };

  const distanceId = formData.get("distanceId");
  const distId = typeof distanceId === "string" && distanceId ? distanceId : null;

  const buffer = Buffer.from(await file.arrayBuffer());

  // Dynamic import — xlsx пакет тяжёлый, только в server action
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  // header:1 даёт массив массивов; первая строка — заголовки
  const rawRows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });

  if (rawRows.length < 2) return { error: "empty_file" };

  // Определяем индексы по заголовкам (регистронезависимо)
  const headers = (rawRows[0] as string[]).map((h) => String(h ?? "").trim().toLowerCase());
  const col = (name: string) => headers.findIndex((h) => h.includes(name));

  const idxRanking  = col("ranking");
  const idxTime     = col("time");
  const idxFamily   = col("family");
  const idxFirst    = col("first");
  const idxGender   = col("gender");
  const idxNat      = col("nationality");
  const idxBib      = col("bib");

  if (idxBib === -1 || idxFamily === -1) return { error: "invalid" };

  type ResultRow = { bibNumber: number; name: string; place: number | null; time: string | null; category: string | null };
  const rows: ResultRow[] = [];

  for (const raw of rawRows.slice(1) as string[][]) {
    const bib = Number(raw[idxBib]);
    if (!bib || isNaN(bib)) continue;

    const family = String(raw[idxFamily] ?? "").trim();
    const first  = String(raw[idxFirst] ?? "").trim();
    const name   = [family, first].filter(Boolean).join(" ");

    const place  = idxRanking !== -1 ? (Number(raw[idxRanking]) || null) : null;
    const time   = idxTime !== -1 ? (String(raw[idxTime] ?? "").trim() || null) : null;

    // category — пол + национальность: "M · KAZ"
    const gender = idxGender !== -1 ? String(raw[idxGender] ?? "").trim() : "";
    const nat    = idxNat    !== -1 ? String(raw[idxNat]    ?? "").trim() : "";
    const category = [gender, nat].filter(Boolean).join(" · ") || null;

    rows.push({ bibNumber: bib, name, place, time, category });
  }

  if (rows.length === 0) return { error: "no_rows" };

  await prisma.$transaction([
    prisma.result.deleteMany({ where: { eventId, source: "ITRA", ...(distId ? { distanceId: distId } : {}) } }),
    prisma.result.createMany({
      data: rows.map((r) => ({ eventId, distanceId: distId, source: "ITRA", ...r })),
      skipDuplicates: true,
    }),
  ]);

  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true, count: rows.length };
}

export async function importResultsCsvAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState & { count?: number }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "invalid" };

  const distanceId = formData.get("distanceId");
  const distId = typeof distanceId === "string" && distanceId ? distanceId : null;

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { error: "empty_file" };

  // Parse CSV: skip header, expect bibNumber,name,place,time,category
  const rows: { bibNumber: number; name: string; place: number | null; time: string | null; category: string | null }[] = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const bibNumber = Number(cols[0]);
    if (!bibNumber || isNaN(bibNumber)) continue;
    const name = cols[1] ?? "";
    const place = cols[2] ? Number(cols[2]) || null : null;
    const time = cols[3] || null;
    const category = cols[4] || null;
    rows.push({ bibNumber, name, place, time, category });
  }
  if (rows.length === 0) return { error: "no_rows" };

  const deleteWhere = distId
    ? { eventId, distanceId: distId, source: "EXCEL" as const }
    : { eventId, source: "EXCEL" as const };

  await prisma.$transaction([
    prisma.result.deleteMany({ where: deleteWhere }),
    prisma.result.createMany({
      data: rows.map((r) => ({ eventId, distanceId: distId, source: "EXCEL", ...r })),
      skipDuplicates: true,
    }),
  ]);
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true, count: rows.length };
}

export async function saveResultsLinkAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const kind = formData.get("kind");
  if (kind !== "myrace" && kind !== "itra") return { error: "invalid" };

  const field = kind === "itra" ? "itraResultsUrl" : "resultsUrl";
  const clear = formData.get("clear") === "1";
  let url: string | null = null;
  if (!clear) {
    const parsed = httpUrlSchema.safeParse(formData.get("url"));
    if (!parsed.success) return { error: "invalid_url" };
    url = parsed.data;
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { [field]: url },
    select: { year: true, race: { select: { slug: true } } },
  });

  revalidatePath(`/[locale]/admin/events/${eventId}`, "page");
  revalidatePath(`/[locale]/events/${updated.race.slug}/${updated.year}`, "page");
  revalidatePath("/[locale]/events", "page");
  return { success: true };
}

export async function clearResultsAction(
  eventId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const source = formData.get("source");
  if (source === "EXCEL" || source === "MYRACE") {
    await prisma.result.deleteMany({ where: { eventId, source } });
  } else {
    await prisma.result.deleteMany({ where: { eventId } });
  }
  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}
