import { revalidatePath } from "next/cache";
import type { UserMessageType } from "@/generated/prisma/client";
import { sendUserMessageEmail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";

export type UserMessagePayload = {
  race: string;
  amount?: number;
};

export function parseUserMessagePayload(value: unknown): UserMessagePayload {
  if (!value || typeof value !== "object") return { race: "" };
  const row = value as { race?: unknown; amount?: unknown };
  const amount = typeof row.amount === "number" ? row.amount : Number(row.amount);
  return {
    race: typeof row.race === "string" ? row.race : "",
    amount: Number.isFinite(amount) ? amount : undefined,
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
        user: { select: { email: true, firstName: true } },
        event: { select: { year: true, race: { select: { name: true } } } },
      },
    });
    if (!registration) return;

    const payload: UserMessagePayload = {
      race: `${registration.event.race.name} ${registration.event.year}`,
    };
    if (extra?.amount != null) payload.amount = extra.amount;

    await prisma.userMessage.create({
      data: {
        userId: registration.userId,
        type,
        payload,
      },
    });
    revalidatePath("/", "layout");
    revalidatePath("/[locale]/account", "page");
    revalidatePath("/[locale]/account/messages", "page");
    void sendUserMessageEmail(
      registration.user.email,
      registration.user.firstName,
      type,
      payload,
    ).catch((error) => console.error("[userMessage] email failed:", error));
  } catch (error) {
    console.error("[userMessage] notify failed:", error);
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
  revalidatePath("/", "layout");
  revalidatePath("/[locale]/account/messages", "page");
}
