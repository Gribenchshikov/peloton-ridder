import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "r7070221898@gmail.com";

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) { console.log("Пользователь не найден"); return; }

  const regs = await prisma.registration.findMany({
    where: { userId: user.id },
    include: { event: { include: { race: true } }, distance: true },
  });

  if (regs.length === 0) { console.log("Регистраций нет"); return; }

  console.log(`Найдено регистраций: ${regs.length}`);
  for (const r of regs) {
    console.log(`  - ${r.event.race.name} ${r.event.year} / ${r.distance?.name ?? "Трансфер"} / ${r.status}`);
  }

  const ids = regs.map(r => r.id);
  const merch = await prisma.registrationMerch.deleteMany({ where: { registrationId: { in: ids } } });
  console.log(`\nУдалено мерча: ${merch.count}`);

  const deleted = await prisma.registration.deleteMany({ where: { id: { in: ids } } });
  console.log(`Удалено регистраций: ${deleted.count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
