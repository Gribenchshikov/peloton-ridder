// Cron endpoint: cancels expired RESERVED registrations and notifies waitlisters.
// Schedule with system crontab (every 5 min):
//   */5 * * * * curl -s -H "Authorization: Bearer $CRON_SECRET" https://ridder.run/api/cron/expire-reservations
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { confirmIfInvoicePaid, confirmPendingPaidInvoices, isApipayConfigured } from "@/lib/apipay";
import { notifyWaitlistForDistance } from "@/lib/waitlist";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let reconciled = 0;
  if (isApipayConfigured()) {
    reconciled = await confirmPendingPaidInvoices();
    console.info("[apipay] reconcile", { confirmed: reconciled });
  }

  const now = new Date();

  const expired = await prisma.registration.findMany({
    where: { status: "RESERVED", reservedUntil: { lte: now } },
    select: { id: true, distanceId: true, kaspiOrderId: true },
  });

  if (expired.length === 0) {
    return NextResponse.json({ cancelled: 0, reconciled });
  }

  const holdForVerification = new Set<string>();
  for (const row of expired) {
    if (!row.kaspiOrderId) continue;
    try {
      const result = await confirmIfInvoicePaid(row.id, row.kaspiOrderId);
      if (result.error) holdForVerification.add(row.id);
    } catch (error) {
      console.error("[cron] confirm paid invoice before expire failed:", row.id, error);
    }
  }

  // Cancel remaining unpaid reservations so freed slots are visible immediately.
  // A paid invoice that failed amount or currency checks stays reserved.
  await prisma.registration.updateMany({
    where: {
      status: "RESERVED",
      reservedUntil: { lte: now },
      ...(holdForVerification.size > 0 ? { id: { notIn: [...holdForVerification] } } : {}),
    },
    data: { status: "CANCELLED", reservedUntil: null },
  });

  // Notify waitlisters for each distance that had a slot freed
  const distanceIds = [...new Set(expired.map((r) => r.distanceId).filter(Boolean) as string[])];
  await Promise.all(distanceIds.map((id) => notifyWaitlistForDistance(id)));

  return NextResponse.json({ cancelled: expired.length, reconciled, distancesNotified: distanceIds.length });
}
