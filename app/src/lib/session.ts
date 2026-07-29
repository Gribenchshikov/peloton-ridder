import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";

/** T139: пользователь является супер-админом если его email совпадает с SUPER_ADMIN_EMAIL в .env */
export function isSuperAdmin(email?: string | null): boolean {
  const sa = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
  return !!(sa && email && email.toLowerCase() === sa);
}

/** Возвращает id авторизованного пользователя или null. */
export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Проверяет isAdmin в JWT. Для Server Actions в админке. */
export async function requireAdminId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.isAdmin ? session.user.id : null;
}

/** Проверяет isAdmin или isOperator. Для Server Actions доступных операторам. */
export async function requireOperatorOrAdminId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return (session.user.isAdmin || session.user.isOperator) ? session.user.id : null;
}

/** Проверяет isAdmin или isFinAdmin. Для Server Actions финансового раздела. */
export async function requireFinAdminOrAdminId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return (session.user.isAdmin || session.user.isFinAdmin) ? session.user.id : null;
}

/** Для страниц полной админки — с проверкой 2FA. */
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
    if (user?.totpEnabledAt) {
      return redirect({ href: "/admin", locale });
    }
  } else {
    if (!user?.totpEnabledAt) {
      return redirect({ href: "/admin/setup-2fa", locale });
    }
  }

  return session.user.id;
}

/** Для страниц доступных оператору или администратору.
 *  Администратор дополнительно проходит проверку 2FA. */
export async function requireOperatorOrAdminPage(locale: string, callbackPath: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: { pathname: "/login", query: { callbackUrl: callbackPath } }, locale });
  }
  if (!session.user.isAdmin && !session.user.isOperator) {
    return redirect({ href: "/", locale });
  }
  // Полный администратор должен иметь 2FA
  if (session.user.isAdmin) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { totpEnabledAt: true } });
    if (!user?.totpEnabledAt) return redirect({ href: "/admin/setup-2fa", locale });
  }
  return session.user.id;
}

/** Для страниц финансового раздела — фин-админ или полный администратор. */
export async function requireFinAdminOrAdminPage(locale: string, callbackPath: string): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    return redirect({ href: { pathname: "/login", query: { callbackUrl: callbackPath } }, locale });
  }
  if (!session.user.isAdmin && !session.user.isFinAdmin) {
    return redirect({ href: "/", locale });
  }
  // Полный администратор должен иметь 2FA
  if (session.user.isAdmin) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { totpEnabledAt: true } });
    if (!user?.totpEnabledAt && callbackPath !== "/admin/setup-2fa") {
      return redirect({ href: "/admin/setup-2fa", locale });
    }
  }
  return session.user.id;
}
