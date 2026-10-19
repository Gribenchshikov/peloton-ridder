import { prisma } from "@/lib/prisma";
import { ensurePaidBibNumber } from "@/lib/bibNumbers";

export const ticketRegistrationSelect = {
  id: true,
  userId: true,
  status: true,
  bibNumber: true,
  isTransferOnly: true,
  includesTransfer: true,
  discountAmount: true,
  eventId: true,
  additionalParticipants: true,
  distance: { select: { name: true, km: true, participantsPerSlot: true, price: true } },
  event: {
    select: {
      year: true,
      dateISO: true,
      location: true,
      transferPrice: true,
      race: { select: { name: true, slug: true, isMass: true } },
    },
  },
  user: { select: { firstName: true, lastName: true } },
} as const;

export async function getTicketRegistration(registrationId: string) {
  return prisma.registration.findUnique({
    where: { id: registrationId },
    select: ticketRegistrationSelect,
  });
}

export type TicketRegistration = NonNullable<Awaited<ReturnType<typeof getTicketRegistration>>>;

export function isTicketReady(reg: TicketRegistration) {
  return reg.status === "PAID" || (reg.status === "RESERVED" && reg.event.race.isMass);
}

export async function ticketTransferPaidSeparately(
  userId: string,
  eventId: string,
  isTransferOnly: boolean,
) {
  if (isTransferOnly) return false;
  return Boolean(
    await prisma.registration.findFirst({
      where: { userId, eventId, isTransferOnly: true, status: "PAID" },
      select: { id: true },
    }),
  );
}

export async function resolveTicketBib(reg: TicketRegistration) {
  if (!reg.isTransferOnly && reg.status === "PAID" && reg.bibNumber == null) {
    return ensurePaidBibNumber(reg.id);
  }
  return reg.bibNumber;
}

export type ExtraParticipant = { firstName: string; lastName: string; birthDate?: string };

export function extraParticipantsOf(reg: TicketRegistration): ExtraParticipant[] {
  const raw = reg.additionalParticipants;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.firstName !== "string" || typeof row.lastName !== "string") return [];
    return [
      {
        firstName: row.firstName,
        lastName: row.lastName,
        birthDate: typeof row.birthDate === "string" ? row.birthDate : undefined,
      },
    ];
  });
}
