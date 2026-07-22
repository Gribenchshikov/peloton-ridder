"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

type ScanResult =
  | { kind: "ok"; registrationId: string; name: string; distance: string; race: string; bibNumber: number | null; transferUsedAt: Date | null }
  | { kind: "error"; message: string };

export async function lookupTransferAction(registrationId: string): Promise<ScanResult> {
  const userId = await requireUserId();
  if (!userId) return { kind: "error", message: "Необходима авторизация" };

  const volunteer = await prisma.user.findUnique({
    where: { id: userId },
    select: { isVolunteer: true, isAdmin: true },
  });
  if (!volunteer?.isVolunteer && !volunteer?.isAdmin) {
    return { kind: "error", message: "Доступ только для волонтёров" };
  }

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      bibNumber: true,
      transferUsedAt: true,
      status: true,
      user: { select: { firstName: true, lastName: true } },
      distance: { select: { name: true, km: true } },
      event: { select: { race: { select: { name: true } }, year: true } },
    },
  });

  if (!reg) return { kind: "error", message: "Регистрация не найдена" };
  if (reg.status !== "PAID") return { kind: "error", message: "Трансфер доступен только для оплаченных регистраций" };

  return {
    kind: "ok",
    registrationId: reg.id,
    name: `${reg.user.firstName} ${reg.user.lastName}`,
    distance: `${reg.distance?.name ?? "Трансфер"}${reg.distance ? ` · ${reg.distance.km} км` : ""}`,
    race: `${reg.event.race.name} ${reg.event.year}`,
    bibNumber: reg.bibNumber,
    transferUsedAt: reg.transferUsedAt,
  };
}

type MarkResult = { ok: true; usedAt: Date } | { error: string };

export async function markTransferUsedAction(registrationId: string): Promise<MarkResult> {
  const userId = await requireUserId();
  if (!userId) return { error: "Необходима авторизация" };

  const volunteer = await prisma.user.findUnique({
    where: { id: userId },
    select: { isVolunteer: true, isAdmin: true },
  });
  if (!volunteer?.isVolunteer && !volunteer?.isAdmin) {
    return { error: "Доступ только для волонтёров" };
  }

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { transferUsedAt: true, status: true },
  });
  if (!reg) return { error: "Регистрация не найдена" };
  if (reg.status !== "PAID") return { error: "Трансфер недоступен" };
  if (reg.transferUsedAt) return { error: "already_used" };

  const updated = await prisma.registration.update({
    where: { id: registrationId },
    data: { transferUsedAt: new Date() },
    select: { transferUsedAt: true },
  });

  return { ok: true, usedAt: updated.transferUsedAt! };
}
