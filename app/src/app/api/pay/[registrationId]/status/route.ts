import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { confirmIfInvoicePaid, isApipayConfigured } from "@/lib/apipay";

export async function GET(_request: Request, context: { params: Promise<{ registrationId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { registrationId } = await context.params;
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { id: true, userId: true, status: true, kaspiOrderId: true, kaspiQrExpiresAt: true },
  });
  if (!registration || registration.userId !== session.user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (registration.status === "PAID") {
    return NextResponse.json({ status: "PAID" });
  }

  if (registration.status !== "RESERVED") {
    return NextResponse.json({ status: registration.status });
  }

  if (isApipayConfigured() && registration.kaspiOrderId) {
    try {
      const invoice = await confirmIfInvoicePaid(registration.id, registration.kaspiOrderId);
      if (invoice.status === "paid") return NextResponse.json({ status: "PAID" });
      const expired = invoice.qr_expires_at ? new Date(invoice.qr_expires_at).getTime() <= Date.now() : false;
      return NextResponse.json({
        status: registration.status,
        invoiceStatus: invoice.status,
        expired,
      });
    } catch (error) {
      console.error("[apipay] status poll failed:", error);
    }
  }

  const expired = registration.kaspiQrExpiresAt ? registration.kaspiQrExpiresAt.getTime() <= Date.now() : false;
  return NextResponse.json({ status: registration.status, expired });
}
