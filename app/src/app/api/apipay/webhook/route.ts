import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/kaspi";
import { findRegistrationForInvoice, getInvoice, isApipayConfigured } from "@/lib/apipay";

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = Buffer.from(signature ?? "");
  const exp = Buffer.from(expected);
  if (got.length !== exp.length) return false;
  return timingSafeEqual(got, exp);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const secret = process.env.APIPAY_WEBHOOK_SECRET;
  if (secret) {
    const signature = request.headers.get("X-Webhook-Signature");
    if (!verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }
  }

  let payload: {
    event?: string;
    invoice?: { id: number; status?: string; external_order_id?: string | null };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (payload.event === "webhook.test") {
    return NextResponse.json({ ok: true });
  }

  if (payload.event !== "invoice.status_changed" || payload.invoice?.status !== "paid") {
    return NextResponse.json({ ok: true });
  }

  if (!isApipayConfigured()) {
    return NextResponse.json({ ok: true });
  }

  try {
    const invoice = await getInvoice(payload.invoice.id);
    if (invoice.status !== "paid") return NextResponse.json({ ok: true });

    const registration = await findRegistrationForInvoice(invoice);
    if (registration) await confirmPayment(registration.id);
  } catch (error) {
    console.error("[apipay] webhook error:", error);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
