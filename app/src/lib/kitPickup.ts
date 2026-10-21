import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { KitLookupQuery } from "@/lib/ticketCode";
import { kitScanSecret, registrationIdFromKitScanToken } from "@/lib/ticketCode";
import { canBoardTransfer, hasConfirmedSlotRefund, isTransferRefunded } from "@/lib/registrationStatus";

const kitRegistrationSelect = {
  id: true,
  status: true,
  bibNumber: true,
  kitPickedUpAt: true,
  transferUsedAt: true,
  includesTransfer: true,
  isTransferOnly: true,
  eventId: true,
  user: { select: { firstName: true, lastName: true, tshirtSize: true } },
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
  eventId: string;
  user: {
    firstName: string;
    lastName: string;
    tshirtSize: string | null;
  };
  event: { year: number; race: { name: string } };
  distance: { name: string; km: number } | null;
  registrationMerch: { size: string | null; merchItem: { name: string; requiresSize: boolean } }[];
  refundRequests: { type: string; status: string }[];
};

export type ScannerAccess =
  | { ok: true; userId: string; scope: "all" }
  | { ok: true; userId: string; scope: "events"; eventIds: string[] }
  | { ok: false; status: number; error: string };

export function scannerCanAccessEvent(access: Extract<ScannerAccess, { ok: true }>, eventId: string) {
  if (access.scope === "all") return true;
  return access.eventIds.includes(eventId);
}

export async function requireKitScanner(): Promise<ScannerAccess> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: "unauthorized" };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, isVolunteer: true, isOperator: true },
  });
  if (user?.isAdmin || user?.isOperator) {
    return { ok: true, userId: session.user.id, scope: "all" };
  }
  if (!user?.isVolunteer) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  const applications = await prisma.volunteerApplication.findMany({
    where: { userId: session.user.id, status: "APPROVED" },
    select: { eventId: true },
  });
  if (applications.length === 0) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return {
    ok: true,
    userId: session.user.id,
    scope: "events",
    eventIds: applications.map((application) => application.eventId),
  };
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
  const secret = kitScanSecret();
  if (!secret) return { error: "invalid_token" as const };
  const registrationId = registrationIdFromKitScanToken(token, secret);
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
    if (!eventId) return null;
    const rows = await prisma.registration.findMany({
      where: {
        eventId,
        id: { endsWith: query.suffix },
        OR: [{ status: "PAID" }, { status: "CANCELLED", isTransferOnly: true }],
      },
      select: kitRegistrationSelect,
      take: 2,
    });
    return rows.length === 1 ? rows[0]! : null;
  }
  if (!eventId) return null;
  return prisma.registration.findFirst({
    where: { eventId, bibNumber: query.bibNumber, status: "PAID", isTransferOnly: false },
    orderBy: { createdAt: "desc" },
    select: kitRegistrationSelect,
  });
}
