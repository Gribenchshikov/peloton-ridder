// Cron endpoint: cancels expired RESERVED registrations and notifies waitlisters.
// Schedule with system crontab (every 5 min):
//   */5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://ridder.run/api/cron/expire-reservations
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyWaitlistForDistance } from "@/lib/waitlist";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${secret}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  const now = new Date();

  const expired = await prisma.registration.findMany({
    where: { status: "RESERVED", reservedUntil: { lte: now } },
    select: { id: true, distanceId: true },
  });

  if (expired.length === 0) {
    return NextResponse.json({ cancelled: 0 });
  }

  // Cancel all expired reservations first so freed slots are visible immediately
  await prisma.registration.updateMany({
    where: { status: "RESERVED", reservedUntil: { lte: now } },
    data: { status: "CANCELLED", reservedUntil: null },
  });

  // Notify waitlisters for each distance that had a slot freed
  const distanceIds = [...new Set(expired.map((r) => r.distanceId).filter(Boolean) as string[])];
  await Promise.all(distanceIds.map((id) => notifyWaitlistForDistance(id)));

  return NextResponse.json({ cancelled: expired.length, distancesNotified: distanceIds.length });
}
