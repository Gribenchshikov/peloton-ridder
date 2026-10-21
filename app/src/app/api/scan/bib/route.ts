import { NextRequest, NextResponse } from "next/server";
import { findRegistrationForKitLookup, requireKitScanner, scannerCanAccessEvent, toKitScanPayload } from "@/lib/kitPickup";
import { parseKitLookupQuery } from "@/lib/ticketCode";

export async function GET(req: NextRequest) {
  const access = await requireKitScanner();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const raw = req.nextUrl.searchParams.get("q") ?? req.nextUrl.searchParams.get("bibNumber");
  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!raw) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const query = parseKitLookupQuery(raw);
  if (!query) {
    return NextResponse.json({ error: "invalid_bib" }, { status: 400 });
  }
  if (query.kind === "bib" && !eventId) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }

  const reg = await findRegistrationForKitLookup(query, eventId);
  if (!reg || !scannerCanAccessEvent(access, reg.eventId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(toKitScanPayload(reg));
}
