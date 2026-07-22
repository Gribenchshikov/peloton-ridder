"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { revalidatePath } from "next/cache";

const TG_API = (token: string) => `https://api.telegram.org/bot${token}`;

export async function createVolunteerTopicAction(
  eventId: string,
): Promise<{ ok?: boolean; chatUrl?: string; error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.VOLUNTEER_TG_CHAT_ID;
  if (!token || !chatId) return { error: "not_configured" };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { race: { select: { name: true } }, year: true, volunteerTgTopicId: true },
  });
  if (!event) return { error: "not_found" };
  if (event.volunteerTgTopicId) return { error: "already_exists" };

  const topicName = `${event.race.name} ${event.year}`;

  // Создать топик в форум-супергруппе
  const topicRes = await fetch(`${TG_API(token)}/createForumTopic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, name: topicName }),
  });
  if (!topicRes.ok) {
    const body = await topicRes.json().catch(() => ({}));
    console.error("createForumTopic error", body);
    return { error: "telegram_error" };
  }
  const topicData = await topicRes.json();
  const topicId: number = topicData.result.message_thread_id;

  // Создать invite link в группу
  const inviteRes = await fetch(`${TG_API(token)}/createChatInviteLink`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, name: topicName }),
  });
  if (!inviteRes.ok) {
    console.error("createChatInviteLink error", await inviteRes.json().catch(() => ({})));
    return { error: "telegram_error" };
  }
  const inviteData = await inviteRes.json();
  const chatUrl: string = inviteData.result.invite_link;

  await prisma.event.update({
    where: { id: eventId },
    data: { volunteerTgTopicId: topicId, volunteerChatUrl: chatUrl },
  });

  revalidatePath("/[locale]/admin/events/[id]", "page");
  return { ok: true, chatUrl };
}

export async function deleteVolunteerTopicAction(
  eventId: string,
): Promise<{ ok?: boolean; error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.VOLUNTEER_TG_CHAT_ID;
  if (!token || !chatId) return { error: "not_configured" };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { volunteerTgTopicId: true },
  });
  if (!event?.volunteerTgTopicId) return { error: "not_found" };

  await fetch(`${TG_API(token)}/deleteForumTopic`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_thread_id: event.volunteerTgTopicId }),
  });

  await prisma.event.update({
    where: { id: eventId },
    data: { volunteerTgTopicId: null, volunteerChatUrl: null },
  });

  revalidatePath("/[locale]/admin/events/[id]", "page");
  return { ok: true };
}
