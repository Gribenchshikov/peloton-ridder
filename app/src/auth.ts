import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Credentials-провайдер не хранит сессии в БД — только JWT в HttpOnly-куке
  // (это дефолт Auth.js: Secure в проде, SameSite=Lax, недоступна из JS). Адаптер не нужен.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
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
        // Намеренно не различаем «нет такого email» и «неверный пароль» в возвращаемом
        // результате — это не даёт злоумышленнику перебором узнать, какие email зарегистрированы.
        if (!user) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        if (user.bannedUntil && user.bannedUntil > new Date()) return null;
        if (user.isFrozen) return null;

        return { id: user.id, email: user.email, isAdmin: user.isAdmin, isOperator: user.isOperator, isFinAdmin: user.isFinAdmin };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin ?? false;
        token.isOperator = user.isOperator ?? false;
        token.isFinAdmin = user.isFinAdmin ?? false;
        return token;
      }
      // Не первый вход — на каждый следующий запрос сверяем, не сброшен ли пароль
      // ПОСЛЕ выдачи этого токена (T44: /reset-password ставит passwordChangedAt),
      // и заодно освежаем роли (чтобы выдача/отзыв применялась сразу).
      if (token.id && token.iat) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { passwordChangedAt: true, isAdmin: true, isOperator: true, isFinAdmin: true },
        });
        if (dbUser?.passwordChangedAt && Math.floor(dbUser.passwordChangedAt.getTime() / 1000) > token.iat) {
          return null;
        }
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.isOperator = dbUser?.isOperator ?? false;
        token.isFinAdmin = dbUser?.isFinAdmin ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.isOperator = (token.isOperator as boolean) ?? false;
        session.user.isFinAdmin = (token.isFinAdmin as boolean) ?? false;
      }
      return session;
    },
  },
});
