import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (!user || !user.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        if (user.bannedUntil && user.bannedUntil > new Date()) return null;
        if (user.isFrozen) return null;

        return { id: user.id, email: user.email, firstName: user.firstName, isAdmin: user.isAdmin, isOperator: user.isOperator, isFinAdmin: user.isFinAdmin };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;

      const email = profile?.email;
      if (!email) return false;

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
        return token;
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
