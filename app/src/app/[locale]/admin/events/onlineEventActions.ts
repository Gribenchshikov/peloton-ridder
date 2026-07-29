"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma, isUniqueConstraintError } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { saveFile } from "@/lib/storage";

export type OnlineActionState = { error?: string; success?: boolean; eventId?: string };

const emptyToUndefined = (value: unknown) => (value === "" || value == null ? undefined : value);

const OnlineEventSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  dateISO: z.coerce.date(),
  challengeWindowEnd: z.coerce.date(),
  registrationDeadline: z.coerce.date(),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "COMPLETED"]),
  isFeatured: z.preprocess((v) => v === "on", z.boolean()),
  price: z.coerce.number().int().min(0),
  maxSlots: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()),
});

const CreateOnlineEventSchema = OnlineEventSchema.extend({
  raceId: z.string().min(1),
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

export async function createOnlineEventAction(
  _locale: string,
  _prevState: OnlineActionState,
  formData: FormData,
): Promise<OnlineActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const coverResult = await extractCoverUrl(formData, null);
  if ("error" in coverResult) return { error: coverResult.error };

  const parsed = CreateOnlineEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  const { price, maxSlots, raceId, ...eventData } = parsed.data;

  let eventId: string;
  try {
    const event = await prisma.event.create({
      data: {
        ...eventData,
        raceId,
        location: "Онлайн",
        cancellationDeadline: eventData.registrationDeadline,
        medicalCancellationDeadline: eventData.registrationDeadline,
        ...coverResult,
      },
    });
    eventId = event.id;

    await prisma.distance.create({
      data: {
        eventId,
        name: "Участие",
        km: 0,
        price,
        maxSlots: maxSlots ?? null,
        participantsPerSlot: 1,
      },
    });
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: "duplicate" };
    throw err;
  }

  revalidatePath("/[locale]/admin", "page");
  return { eventId };
}

export async function updateOnlineEventAction(
  eventId: string,
  _prevState: OnlineActionState,
  formData: FormData,
): Promise<OnlineActionState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const coverResult = await extractCoverUrl(formData, null);
  if ("error" in coverResult) return { error: coverResult.error };

  const parsed = OnlineEventSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  const { price, maxSlots, ...eventData } = parsed.data;
  const raceName = (formData.get("raceName") as string | null)?.trim() || null;
  const newRaceId = (formData.get("raceId") as string | null)?.trim() || null;

  try {
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...eventData,
        location: "Онлайн",
        cancellationDeadline: eventData.registrationDeadline,
        medicalCancellationDeadline: eventData.registrationDeadline,
        ...coverResult,
        ...(newRaceId ? { raceId: newRaceId } : {}),
      },
    });

    const targetRaceId = newRaceId ?? event.raceId;
    if (raceName) {
      await prisma.race.update({ where: { id: targetRaceId }, data: { name: raceName } });
    }

    const existing = await prisma.distance.findFirst({
      where: { eventId, km: 0 },
      select: { id: true },
    });

    if (existing) {
      await prisma.distance.update({
        where: { id: existing.id },
        data: { price, maxSlots: maxSlots ?? null },
      });
    } else {
      await prisma.distance.create({
        data: { eventId, name: "Участие", km: 0, price, maxSlots: maxSlots ?? null, participantsPerSlot: 1 },
      });
    }
  } catch (err) {
    if (isUniqueConstraintError(err)) return { error: "duplicate" };
    throw err;
  }

  revalidatePath("/[locale]/admin/events/[id]", "page");
  revalidatePath("/[locale]/admin", "page");
  revalidatePath("/[locale]/events/[slug]/[year]", "page");
  return { success: true };
}
