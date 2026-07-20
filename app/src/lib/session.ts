import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

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
 * такой страницы обычным пользователям). Используется во всех /admin/* страницах.
 * Дополнительно: если у администратора не настроена 2FA — редиректит на /admin/setup-2fa
 * (кроме самой страницы настройки, чтобы избежать бесконечного цикла). */
export async function requireAdminPage(locale: string, callbackPath: string = "/admin"): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: { pathname: "/login", query: { callbackUrl: callbackPath } }, locale });
  }

  if (!session.user.isAdmin) {
    return redirect({ href: "/", locale });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpEnabledAt: true },
  });
  if (callbackPath === "/admin/setup-2fa") {
    // Already configured → back to admin
    if (user?.totpEnabledAt) {
      return redirect({ href: "/admin", locale });
    }
  } else {
    // Not yet configured → force setup
    if (!user?.totpEnabledAt) {
      return redirect({ href: "/admin/setup-2fa", locale });
    }
  }

  return session.user.id;
}
