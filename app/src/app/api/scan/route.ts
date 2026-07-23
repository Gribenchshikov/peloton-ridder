import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
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

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  // Формат токена: "RIDDER:<registrationId>"
  const prefix = "RIDDER:";
  if (!token.startsWith(prefix)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }
  const registrationId = token.slice(prefix.length);

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      id: true,
      status: true,
      bibNumber: true,
      kitPickedUpAt: true,
      transferUsedAt: true,
      includesTransfer: true,
      isTransferOnly: true,
      user: { select: { firstName: true, lastName: true, email: true, phone: true, tshirtSize: true } },
      event: { select: { year: true, race: { select: { name: true } } } },
      distance: { select: { name: true, km: true } },
      registrationMerch: { select: { size: true, merchItem: { select: { name: true, requiresSize: true } } } },
    },
  });

  if (!reg) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    registrationId: reg.id,
    status: reg.status,
    bibNumber: reg.bibNumber,
    kitPickedUpAt: reg.kitPickedUpAt,
    transferUsedAt: reg.transferUsedAt,
    includesTransfer: reg.includesTransfer || reg.isTransferOnly,
    isTransferOnly: reg.isTransferOnly,
    participant: {
      firstName: reg.user.firstName,
      lastName: reg.user.lastName,
      email: reg.user.email,
      phone: reg.user.phone,
      tshirtSize: reg.user.tshirtSize,
    },
    event: `${reg.event.race.name} ${reg.event.year}`,
    distance: reg.isTransferOnly ? "Только трансфер" : reg.distance ? `${reg.distance.name} (${reg.distance.km} км)` : "—",
    merch: reg.registrationMerch.map((m) => ({
      name: m.merchItem.name,
      size: m.merchItem.requiresSize ? m.size : null,
    })),
  });
}
