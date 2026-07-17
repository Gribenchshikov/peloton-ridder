import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { TokenPurpose } from "@/generated/prisma/client";

export type { TokenPurpose };

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 часа

export async function createVerificationToken(email: string, purpose: TokenPurpose = "EMAIL_VERIFY") {
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { email, token, purpose, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return token;
}

async function findMatchingToken(token: string, purpose: TokenPurpose) {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  return record && record.purpose === purpose ? record : null;
}

/** Проверяет токен без удаления — для рендера страницы (например, формы сброса пароля)
 * до того, как пользователь реально что-то отправил. Не считается использованием токена. */
export async function peekVerificationToken(token: string, purpose: TokenPurpose): Promise<boolean> {
  const record = await findMatchingToken(token, purpose);
  return Boolean(record && record.expiresAt >= new Date());
}

/** Возвращает email, если токен найден и совпадает по purpose, иначе null (без удаления —
 * значит, токен не был выпущен под этот purpose, и его нельзя тратить на чужой флоу).
 * Если purpose совпал, токен удаляется сразу — одноразовость гарантирована независимо
 * от того, истёк он или нет (истёкший тоже удаляется, просто вернёт null). */
export async function consumeVerificationToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  const record = await findMatchingToken(token, purpose);
  if (!record) return null;

  await prisma.verificationToken.delete({ where: { token } });

  if (record.expiresAt < new Date()) return null;
  return record.email;
}
