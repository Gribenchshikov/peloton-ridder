import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  const races = await prisma.race.findMany({ select: { name: true, icon: true } });
  races.forEach((r) => console.log(r.name, "|", r.icon));
  await prisma.$disconnect();
}

main();
