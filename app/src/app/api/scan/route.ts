import { NextRequest, NextResponse } from "next/server";
import { findRegistrationByQrToken, requireKitScanner, toKitScanPayload } from "@/lib/kitPickup";

export async function GET(req: NextRequest) {
  const access = await requireKitScanner();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 400 });
  }

  const result = await findRegistrationByQrToken(token);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.error === "not_found" ? 404 : 400 });
  }
  return NextResponse.json(toKitScanPayload(result));
}
