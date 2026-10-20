import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { KitLookupQuery } from "@/lib/ticketCode";
import { canBoardTransfer, hasConfirmedSlotRefund, isTransferRefunded } from "@/lib/registrationStatus";

const kitRegistrationSelect = {
  id: true,
  status: true,
  bibNumber: true,
  kitPickedUpAt: true,
  transferUsedAt: true,
  includesTransfer: true,
  isTransferOnly: true,
  user: { select: { firstName: true, lastName: true, email: true, phone: true, tshirtSize: true } },
  event: { select: { year: true, race: { select: { name: true } } } },
  distance: { select: { name: true, km: true } },
  registrationMerch: { select: { size: true, merchItem: { select: { name: true, requiresSize: true } } } },
  refundRequests: { select: { type: true, status: true } },
} as const;

type KitRegistration = {
  id: string;
  status: string;
  bibNumber: number | null;
  kitPickedUpAt: Date | null;
  transferUsedAt: Date | null;
  includesTransfer: boolean;
  isTransferOnly: boolean;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    tshirtSize: string | null;
  };
  event: { year: number; race: { name: string } };
  distance: { name: string; km: number } | null;
  registrationMerch: { size: string | null; merchItem: { name: string; requiresSize: boolean } }[];
  refundRequests: { type: string; status: string }[];
};

export async function requireKitScanner(): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, isVolunteer: true, isOperator: true },
  });
  if (!user?.isAdmin && !user?.isVolunteer && !user?.isOperator) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return { ok: true };
}

export function toKitScanPayload(reg: KitRegistration) {
  const transferRefunded = isTransferRefunded(reg);
  return {
    registrationId: reg.id,
    status: reg.status,
    bibNumber: reg.bibNumber,
    kitPickedUpAt: reg.kitPickedUpAt,
    transferUsedAt: reg.transferUsedAt,
    includesTransfer: canBoardTransfer(reg),
    isTransferOnly: reg.isTransferOnly,
    slotCancelled: reg.isTransferOnly && hasConfirmedSlotRefund(reg.refundRequests),
    transferRefunded,
    participant: {
      firstName: reg.user.firstName,
      lastName: reg.user.lastName,
      email: reg.user.email,
      phone: reg.user.phone,
      tshirtSize: reg.user.tshirtSize,
    },
    event: `${reg.event.race.name} ${reg.event.year}`,
    distance: reg.isTransferOnly
      ? "Только трансфер"
      : reg.distance
        ? `${reg.distance.name} (${reg.distance.km} км)`
        : "—",
    merch: reg.registrationMerch.map((m) => ({
      name: m.merchItem.name,
      size: m.merchItem.requiresSize ? m.size : null,
    })),
  };
}

export async function findRegistrationByQrToken(token: string) {
  const prefix = "RIDDER:";
  if (!token.startsWith(prefix)) return { error: "invalid_token" as const };
  const registrationId = token.slice(prefix.length);
  if (!registrationId) return { error: "invalid_token" as const };
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: kitRegistrationSelect,
  });
  if (!reg) return { error: "not_found" as const };
  if (reg.status === "PAID") return reg;
  if (reg.isTransferOnly && reg.status === "CANCELLED") return reg;
  return { error: "not_found" as const };
}

export async function findRegistrationForKitLookup(query: KitLookupQuery, eventId: string | null) {
  if (query.kind === "code") {
    return prisma.registration.findFirst({
      where: {
        id: { endsWith: query.suffix },
        OR: [{ status: "PAID" }, { status: "CANCELLED", isTransferOnly: true }],
      },
      orderBy: { createdAt: "desc" },
      select: kitRegistrationSelect,
    });
  }
  if (!eventId) return null;
  return prisma.registration.findFirst({
    where: { eventId, bibNumber: query.bibNumber, status: "PAID", isTransferOnly: false },
    orderBy: { createdAt: "desc" },
    select: kitRegistrationSelect,
  });
}
