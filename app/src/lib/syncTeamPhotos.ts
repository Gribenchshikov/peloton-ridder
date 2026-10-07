import { prisma } from "@/lib/prisma";
import { putPublicObject } from "@/lib/storage";
import { extFromPhoto, storageKeyFromPhotoUrl, TEAM_SEED } from "@/lib/teamSeedData";

export type SyncTeamPhotosResult = {
  uploaded: number;
  skipped: number;
  errors: string[];
};

export async function syncTeamPhotosToStorage(): Promise<SyncTeamPhotosResult> {
  const sources = new Map(TEAM_SEED.map((member) => [member.name, member.photo]));
  const members = await prisma.teamMember.findMany({
    where: { type: "TEAM" },
    select: { id: true, name: true, photoUrl: true },
  });

  let uploaded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const member of members) {
    const source = sources.get(member.name);
    if (!source) {
      skipped += 1;
      continue;
    }

    try {
      const res = await fetch(source);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const { ext, type } = extFromPhoto(source, res.headers.get("content-type"));
      const key = storageKeyFromPhotoUrl(member.photoUrl, `team/${crypto.randomUUID()}.${ext}`);
      const photoUrl = await putPublicObject(key, buffer, type);
      if (member.photoUrl !== photoUrl) {
        await prisma.teamMember.update({ where: { id: member.id }, data: { photoUrl } });
      }
      uploaded += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${member.name}: ${message}`);
    }
  }

  return { uploaded, skipped, errors };
}
