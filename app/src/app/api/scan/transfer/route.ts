import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireKitScanner } from "@/lib/kitPickup";

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
    select: { status: true, includesTransfer: true, isTransferOnly: true, transferUsedAt: true },
  });

  if (!reg) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (reg.status !== "PAID") return NextResponse.json({ error: "not_paid" }, { status: 422 });
  if (!reg.includesTransfer && !reg.isTransferOnly) {
    return NextResponse.json({ error: "no_transfer" }, { status: 422 });
  }

  const updated = await prisma.registration.update({
    where: { id: registrationId },
    data: { transferUsedAt: reg.transferUsedAt ?? new Date() },
    select: { transferUsedAt: true },
  });

  return NextResponse.json({ transferUsedAt: updated.transferUsedAt });
}
