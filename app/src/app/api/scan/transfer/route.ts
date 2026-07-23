import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, isVolunteer: true },
  });
  if (!user?.isAdmin && !user?.isVolunteer) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
