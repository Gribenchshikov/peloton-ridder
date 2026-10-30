import { headers } from "next/headers";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { googleProviderOptions } from "@/lib/googleOAuth";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clientIp } from "@/lib/rateLimit";
import { normalizeLoginEmail } from "@/lib/loginThrottle";
import { clearEmailLoginFailures, readLoginLock, recordLoginFailure } from "@/lib/loginThrottleStore";

const PRIVILEGED_SESSION_SECONDS = 12 * 60 * 60;

let dummyPasswordHash: Promise<string> | null = null;

function spendPasswordTime(password: string) {
  dummyPasswordHash ??= hashPassword("not-a-user-password");
  return dummyPasswordHash.then((hash) => verifyPassword(password, hash));
}

export async function authorizeCredentials(credentials: Partial<Record<"email" | "password", unknown>> | undefined) {
  const email = normalizeLoginEmail(credentials?.email);
  const password = credentials?.password;
  if (!email || typeof password !== "string") return null;

  const ip = clientIp(await headers());
  let locked = false;
  try {
    locked = (await readLoginLock(ip, email)).locked;
  } catch (error) {
    console.error("[login] throttle read failed");
    void error;
    return null;
  }
  if (locked) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
  if (!user?.passwordHash) await spendPasswordTime(password);
  if (!valid || !user || (user.bannedUntil && user.bannedUntil > new Date()) || user.isFrozen) {
    try {
      await recordLoginFailure(ip, email);
    } catch (error) {
      console.error("[login] throttle update failed");
      void error;
    }
    return null;
  }

  try {
    await clearEmailLoginFailures(email);
  } catch (error) {
    console.error("[login] throttle reset failed");
    void error;
  }

  return { id: user.id, email: user.email, firstName: user.firstName, isAdmin: user.isAdmin, isOperator: user.isOperator, isFinAdmin: user.isFinAdmin };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 12 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google(googleProviderOptions()),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      const email = profile?.email;
      const emailVerified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      if (!email || emailVerified !== true) return false;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        // Создаём профиль из Google-данных
        const googleProfile = profile as { given_name?: string; family_name?: string; picture?: string; name?: string };
        const nameParts = (googleProfile.name ?? "").split(" ");
        await prisma.user.create({
          data: {
            email,
            firstName: googleProfile.given_name ?? nameParts[0] ?? "Участник",
            lastName: googleProfile.family_name ?? nameParts.slice(1).join(" ") ?? "",
            emailVerified: new Date(),
            avatarUrl: googleProfile.picture ?? null,
          },
        });
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // Первый вход (credentials или google)
      if (user && account) {
        if (account.provider === "google") {
          // Загружаем наш DB-ID по email из Google-профиля
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email! },
            select: { id: true, firstName: true, isAdmin: true, isOperator: true, isFinAdmin: true },
          });
          if (!dbUser) return null;
          token.id = dbUser.id;
          token.firstName = dbUser.firstName;
          token.isAdmin = dbUser.isAdmin;
          token.isOperator = dbUser.isOperator;
          token.isFinAdmin = dbUser.isFinAdmin;
        } else {
          token.id = user.id;
          token.firstName = user.firstName;
          token.isAdmin = user.isAdmin ?? false;
          token.isOperator = user.isOperator ?? false;
          token.isFinAdmin = user.isFinAdmin ?? false;
        }
        token.authAt = Math.floor(Date.now() / 1000);
        return token;
      }

      const privileged = Boolean(token.isAdmin || token.isOperator || token.isFinAdmin);
      if (privileged && (typeof token.authAt !== "number" || Math.floor(Date.now() / 1000) - token.authAt > PRIVILEGED_SESSION_SECONDS)) {
        return null;
      }

      // Последующие запросы — освежаем роли и проверяем смену пароля
      if (token.id && token.iat) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { passwordChangedAt: true, firstName: true, isAdmin: true, isOperator: true, isFinAdmin: true, bannedUntil: true, isFrozen: true },
        });
        if (dbUser?.passwordChangedAt && Math.floor(dbUser.passwordChangedAt.getTime() / 1000) > token.iat) {
          return null;
        }
        if (dbUser?.isFrozen || (dbUser?.bannedUntil && dbUser.bannedUntil > new Date())) {
          return null;
        }
        token.firstName = dbUser?.firstName;
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.isOperator = dbUser?.isOperator ?? false;
        token.isFinAdmin = dbUser?.isFinAdmin ?? false;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.firstName = token.firstName as string | undefined;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.isOperator = (token.isOperator as boolean) ?? false;
        session.user.isFinAdmin = (token.isFinAdmin as boolean) ?? false;
      }
      return session;
    },
  },
});
