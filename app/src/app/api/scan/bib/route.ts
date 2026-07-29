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
    select: { isAdmin: true, isVolunteer: true, isOperator: true },
  });
  if (!user?.isAdmin && !user?.isVolunteer && !user?.isOperator) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const bibParam = req.nextUrl.searchParams.get("bibNumber");
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!bibParam || !eventId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const bibNumber = Number(bibParam);
  if (!Number.isInteger(bibNumber) || bibNumber <= 0) {
    return NextResponse.json({ error: "invalid_bib" }, { status: 400 });
  }

  const reg = await prisma.registration.findFirst({
    where: { eventId, bibNumber, status: "PAID" },
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
