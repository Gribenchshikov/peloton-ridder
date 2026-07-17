import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 часа

export async function createVerificationToken(email: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { email, token, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  return token;
}

/** Возвращает email, если токен валиден и не просрочен, иначе null. Токен одноразовый — удаляется сразу. */
export async function consumeVerificationToken(token: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record) return null;

  await prisma.verificationToken.delete({ where: { token } });

  if (record.expiresAt < new Date()) return null;
  return record.email;
}
