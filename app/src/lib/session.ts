import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";

/** Возвращает id авторизованного пользователя или null. Единая точка проверки сессии для Server Actions. */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** То же самое, но дополнительно проверяет User.isAdmin (флаг лежит в JWT — см. auth.ts,
 * освежается на каждый запрос, отдельного похода в БД тут не нужно). Для Server Actions в админке. */
export async function requireAdminId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.isAdmin ? session.user.id : null;
}

/** Для страниц админки (Server Component): гарантированно возвращает id админа или сама
 * делает редирект — не залогинен → /login с возвратом на callbackPath, залогинен, но не
 * админ → на главную (без отдельного сообщения "у вас нет доступа" — не палим наличие
 * такой страницы обычным пользователям). Используется во всех /admin/* страницах. */
export async function requireAdminPage(locale: string, callbackPath: string = "/admin"): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: { pathname: "/login", query: { callbackUrl: callbackPath } }, locale });
  }

  if (!session.user.isAdmin) {
    return redirect({ href: "/", locale });
  }

  return session.user.id;
}
