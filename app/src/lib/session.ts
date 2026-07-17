import { auth } from "@/auth";

/** Возвращает id авторизованного пользователя или null. Единая точка проверки сессии для Server Actions. */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
