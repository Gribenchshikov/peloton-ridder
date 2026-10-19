"use server";

import { prisma } from "@/lib/prisma";
import { canBoardTransfer, isTransferRefunded, TRANSFER_REFUNDED_BOARDING_MESSAGE } from "@/lib/registrationStatus";
import { requireUserId } from "@/lib/session";

type TransferInfo = {
  registrationId: string;
  name: string;
  distance: string;
  race: string;
  bibNumber: number | null;
  transferUsedAt: Date | null;
};

type ScanResult =
  | ({ kind: "ok" } & TransferInfo)
  | ({ kind: "refunded"; message: string } & TransferInfo)
  | { kind: "error"; message: string };

function toTransferInfo(reg: {
  id: string;
  bibNumber: number | null;
  transferUsedAt: Date | null;
  isTransferOnly: boolean;
  user: { firstName: string; lastName: string };
  distance: { name: string; km: number } | null;
  event: { year: number; race: { name: string } };
}): TransferInfo {
  return {
    registrationId: reg.id,
    name: `${reg.user.firstName} ${reg.user.lastName}`,
    distance: reg.isTransferOnly
      ? "Только трансфер"
      : `${reg.distance?.name ?? "—"}${reg.distance ? ` · ${reg.distance.km} км` : ""}`,
    race: `${reg.event.race.name} ${reg.event.year}`,
    bibNumber: reg.bibNumber,
    transferUsedAt: reg.transferUsedAt,
  };
}

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
      includesTransfer: true,
      isTransferOnly: true,
      refundRequests: { select: { type: true, status: true } },
      user: { select: { firstName: true, lastName: true } },
      distance: { select: { name: true, km: true } },
      event: { select: { race: { select: { name: true } }, year: true } },
    },
  });

  if (!reg) return { kind: "error", message: "Регистрация не найдена" };
  if (isTransferRefunded(reg)) {
    return { kind: "refunded", message: TRANSFER_REFUNDED_BOARDING_MESSAGE, ...toTransferInfo(reg) };
  }
  if (reg.status !== "PAID") return { kind: "error", message: "Регистрация не оплачена" };
  if (!canBoardTransfer(reg)) {
    return { kind: "error", message: "Трансфер не включён в эту регистрацию" };
  }

  return { kind: "ok", ...toTransferInfo(reg) };
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
    select: {
      transferUsedAt: true,
      status: true,
      includesTransfer: true,
      isTransferOnly: true,
      refundRequests: { select: { type: true, status: true } },
    },
  });
  if (!reg) return { error: "Регистрация не найдена" };
  if (isTransferRefunded(reg)) return { error: TRANSFER_REFUNDED_BOARDING_MESSAGE };
  if (!canBoardTransfer(reg)) return { error: "Трансфер недоступен" };
  if (reg.transferUsedAt) return { error: "already_used" };

  const updated = await prisma.registration.update({
    where: { id: registrationId },
    data: { transferUsedAt: new Date() },
    select: { transferUsedAt: true },
  });

  return { ok: true, usedAt: updated.transferUsedAt! };
}
