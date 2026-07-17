import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";

// Команда предназначена для первого администратора: публичного способа получить
// роль нет. Дальше организаторы будут управлять ролями в админке (T39.1).
try {
  process.loadEnvFile();
} catch (error) {
  // DATABASE_URL может быть передан окружением (например, на сервере), поэтому
  // отсутствие локального .env само по себе не является ошибкой.
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

const emailSchema = z.string().trim().toLowerCase().email();

function usage(): never {
  console.error("Использование: npm run admin:grant -- user@example.com");
  process.exit(1);
}

async function main() {
  const rawEmail = process.argv[2];
  if (!rawEmail) usage();

  const parsedEmail = emailSchema.safeParse(rawEmail);
  if (!parsedEmail.success) usage();

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL не задан. Создайте .env по шаблону .env.example.");
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const user = await prisma.user.findUnique({
      where: { email: parsedEmail.data },
      select: { email: true, emailVerified: true, isAdmin: true },
    });

    if (!user) {
      throw new Error("Пользователь не найден. Сначала зарегистрируйте аккаунт.");
    }
    if (!user.emailVerified) {
      throw new Error("Email не подтверждён. Сначала перейдите по ссылке из письма.");
    }
    if (user.isAdmin) {
      console.log(`Пользователь ${user.email} уже является администратором.`);
      return;
    }

    await prisma.user.update({ where: { email: user.email }, data: { isAdmin: true } });
    console.log(`Права администратора выданы: ${user.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
