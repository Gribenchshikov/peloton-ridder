/**
 * Import club team from TEAM_SEED into TeamMember (type TEAM).
 * Uploads photos to MinIO and also writes public/uploads/team for local Next.js.
 * Volunteers are left intact.
 */
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { putPublicObject } from "../src/lib/storage";
import { extFromPhoto, TEAM_SEED } from "../src/lib/teamSeedData";

const root = dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(resolve(root, "../.env"));
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL не задан");

  const photosDir = resolve(root, "../public/uploads/team");
  await mkdir(photosDir, { recursive: true });

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const rows = [];
    for (const [index, member] of TEAM_SEED.entries()) {
      const res = await fetch(member.photo);
      if (!res.ok) throw new Error(`Не удалось скачать фото ${member.name}: ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const { ext, type } = extFromPhoto(member.photo, res.headers.get("content-type"));
      const filename = `${randomUUID()}.${ext}`;
      const key = `team/${filename}`;
      await writeFile(resolve(photosDir, filename), buffer);
      try {
        await putPublicObject(key, buffer, type);
      } catch (error) {
        console.warn(`MinIO недоступен для ${member.name}, файл только в public/:`, error);
      }
      rows.push({
        name: member.name,
        role: member.role,
        bio: member.bio,
        photoUrl: `/uploads/${key}`,
        type: "TEAM" as const,
        order: index + 1,
      });
      console.log(`OK ${member.name}`);
    }

    await prisma.teamMember.deleteMany({ where: { type: "TEAM" } });
    await prisma.teamMember.createMany({ data: rows });
    console.log(`Импортировано участников: ${rows.length}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
