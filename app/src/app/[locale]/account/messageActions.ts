"use server";

import { requireUserId } from "@/lib/session";
import { markUserMessagesRead } from "@/lib/userMessages";

export async function markUserMessagesReadAction(ids: string[]) {
  const userId = await requireUserId();
  if (!userId || ids.length === 0) return;
  await markUserMessagesRead(userId, ids);
}
