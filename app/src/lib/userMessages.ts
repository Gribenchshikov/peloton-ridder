import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { UserMessageType } from "@/generated/prisma/client";
import { sendUserMessageEmail } from "@/lib/mailer";
import { ticketPaymentSummary, type TicketPaymentKind } from "@/lib/paymentAmount";
import { prisma } from "@/lib/prisma";

const PAYMENT_KINDS = new Set<TicketPaymentKind>(["slot", "slotAndTransfer", "transfer"]);

export type UserMessagePayload = {
  race: string;
  amount?: number;
  kind?: TicketPaymentKind;
  applicant?: string;
  email?: string;
  phone?: string;
  text?: string;
};

function parsePaymentKind(value: unknown): TicketPaymentKind | undefined {
  return typeof value === "string" && PAYMENT_KINDS.has(value as TicketPaymentKind)
    ? (value as TicketPaymentKind)
    : undefined;
}

function revalidateUserMessageViews() {
  // Страницы админки дочитывают возврат во время рендера. revalidatePath в этой
  // фазе роняет ответ, поэтому сброс кэша откладывается до конца запроса.
  try {
    after(() => {
      revalidatePath("/", "layout");
      revalidatePath("/[locale]/account", "page");
      revalidatePath("/[locale]/account/messages", "page");
    });
  } catch (error) {
    console.error("[userMessage] revalidate failed:", error);
  }
}

export function parseUserMessagePayload(value: unknown): UserMessagePayload {
  if (!value || typeof value !== "object") return { race: "" };
  const row = value as {
    race?: unknown;
    amount?: unknown;
    kind?: unknown;
    applicant?: unknown;
    email?: unknown;
    phone?: unknown;
    text?: unknown;
  };
  const amount = typeof row.amount === "number" ? row.amount : Number(row.amount);
  return {
    race: typeof row.race === "string" ? row.race : "",
    amount: Number.isFinite(amount) ? amount : undefined,
    kind: parsePaymentKind(row.kind),
    applicant: typeof row.applicant === "string" ? row.applicant : undefined,
    email: typeof row.email === "string" ? row.email : undefined,
    phone: typeof row.phone === "string" ? row.phone : undefined,
    text: typeof row.text === "string" ? row.text : undefined,
  };
}

export async function notifyFromRegistration(
  registrationId: string,
  type: UserMessageType,
  extra?: { amount?: number },
) {
  try {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      select: {
        userId: true,
        isTransferOnly: true,
        includesTransfer: true,
        discountAmount: true,
        user: { select: { email: true, firstName: true } },
        distance: { select: { price: true } },
        event: { select: { year: true, transferPrice: true, race: { select: { name: true } } } },
      },
    });
    if (!registration) return;

    const payload: UserMessagePayload = {
      race: `${registration.event.race.name} ${registration.event.year}`,
    };
    if (type === "PAYMENT") {
      const payment = ticketPaymentSummary(registration);
      payload.amount = extra?.amount ?? payment.amount;
      payload.kind = payment.kind;
    } else if (extra?.amount != null) {
      payload.amount = extra.amount;
    }

    await prisma.userMessage.create({
      data: {
        userId: registration.userId,
        type,
        payload,
      },
    });

    void sendUserMessageEmail(
      registration.user.email,
      registration.user.firstName,
      type,
      payload,
    ).catch((error) => {
      console.error("[userMessage] email failed:", type, registration.user.email, error);
    });

    revalidateUserMessageViews();
  } catch (error) {
    console.error("[userMessage] notify failed:", error);
  }
}

export async function notifyAdminsVolunteerApplication(applicantName: string, race: string) {
  try {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { id: true },
    });
    if (admins.length === 0) return;

    await prisma.userMessage.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "VOLUNTEER_APPLICATION",
        payload: { race, applicant: applicantName },
      })),
    });
    revalidateUserMessageViews();
  } catch (error) {
    console.error("[userMessage] volunteer application notify failed:", error);
  }
}

export async function notifyAdminsOrganizerMessage(input: {
  name: string;
  email: string;
  phone?: string | null;
  topic: string;
  text: string;
}) {
  try {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { id: true },
    });
    if (admins.length === 0) return;

    const payload: UserMessagePayload = {
      race: input.topic,
      applicant: input.name,
      email: input.email,
      phone: input.phone?.trim() || undefined,
      text: input.text,
    };
    await prisma.userMessage.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "ORGANIZER_MESSAGE" as const,
        payload,
      })),
    });
    revalidateUserMessageViews();
  } catch (error) {
    console.error("[userMessage] organizer message notify failed:", error);
  }
}

export function countUnreadUserMessages(userId: string) {
  return prisma.userMessage.count({ where: { userId, readAt: null } });
}

export const USER_MESSAGES_PAGE_SIZE = 15;

export async function listUserMessages(userId: string, page = 1) {
  const take = USER_MESSAGES_PAGE_SIZE;
  const total = await prisma.userMessage.count({ where: { userId } });
  const pageCount = Math.max(1, Math.ceil(total / take));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const items = await prisma.userMessage.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (safePage - 1) * take,
    take,
    select: { id: true, type: true, payload: true, readAt: true, createdAt: true },
  });
  return { items, total, page: safePage, pageCount };
}

export async function markUserMessagesRead(userId: string, ids?: string[]) {
  if (ids && ids.length === 0) return;
  await prisma.userMessage.updateMany({
    where: {
      userId,
      readAt: null,
      ...(ids ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
}
