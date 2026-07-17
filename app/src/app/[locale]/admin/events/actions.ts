"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, isUniqueConstraintError } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";

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
  coverImageUrl: z.preprocess(emptyToUndefined, httpUrlSchema.optional()),
  volunteerChatUrl: z.preprocess(emptyToUndefined, httpUrlSchema.optional()),
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
    minAge: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(120).optional()),
    maxAge: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(120).optional()),
    cutoffMinutes: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
    bibRangeStart: z.coerce.number().int().min(0),
    bibRangeEnd: z.coerce.number().int().min(0),
  })
  .refine((d) => d.bibRangeEnd >= d.bibRangeStart, { path: ["bibRangeEnd"], message: "bibRange" });

export type ActionState = { error?: string; success?: boolean };

/** Парсит FormData по схеме и сводит любую ошибку валидации к единому "invalid" —
 * дальше формы просто показывают общий "проверьте поля", без разбора по конкретному полю. */
function parseFormData<T>(schema: z.ZodType<T>, formData: FormData): { data: T } | { error: "invalid" } {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };
  return { data: parsed.data };
}

export async function createEventAction(locale: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parseFormData(CreateEventSchema, formData);
  if ("error" in parsed) return parsed;

  let eventId: string;
  try {
    const event = await prisma.event.create({ data: parsed.data });
    eventId = event.id;
  } catch (err) {
    // Уникальный (raceId, year) конфликт — если организатор по ошибке создаёт второй
    // забег той же трассы на тот же год, это почти наверняка опечатка, не гасим молча.
    if (isUniqueConstraintError(err)) return { error: "duplicate" };
    throw err;
  }

  return redirect({ href: `/admin/events/${eventId}`, locale });
}

export async function updateEventAction(eventId: string, _prevState: ActionState, formData: FormData): Promise<ActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const parsed = parseFormData(EventFieldsSchema, formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.event.update({ where: { id: eventId }, data: parsed.data });
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
