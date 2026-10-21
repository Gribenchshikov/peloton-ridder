import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireKitScanner, scannerCanAccessEvent } from "@/lib/kitPickup";

export async function POST(req: NextRequest) {
  const access = await requireKitScanner();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json().catch(() => null);
  const registrationId = body?.registrationId;
  if (!registrationId || typeof registrationId !== "string") {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { status: true, kitPickedUpAt: true, isTransferOnly: true, eventId: true },
  });

  if (!reg || !scannerCanAccessEvent(access, reg.eventId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (reg.status !== "PAID") {
    return NextResponse.json({ error: "not_paid" }, { status: 422 });
  }
  if (reg.isTransferOnly) {
    return NextResponse.json({ error: "transfer_only" }, { status: 422 });
  }

  const updated = await prisma.registration.update({
    where: { id: registrationId },
    data: { kitPickedUpAt: reg.kitPickedUpAt ?? new Date() },
    select: { kitPickedUpAt: true },
  });

  return NextResponse.json({ kitPickedUpAt: updated.kitPickedUpAt });
}
