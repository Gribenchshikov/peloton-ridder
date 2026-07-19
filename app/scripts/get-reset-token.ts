import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

try { process.loadEnvFile(); } catch {}

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter } as never);
  const tokens = await (prisma as any).verificationToken.findMany({
    where: { purpose: "PASSWORD_RESET" },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  if (tokens.length === 0) {
    console.log("Токен не найден — сначала запроси сброс на /forgot-password");
  } else {
    console.log(`\nСсылка для сброса пароля:\nhttp://localhost:3001/ru/reset-password?token=${tokens[0].token}\n`);
  }
  await pool.end();
}
main();
