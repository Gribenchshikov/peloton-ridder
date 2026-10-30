import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Живость процесса. Базу и MinIO не трогаем: краткий сбой не должен перезапускать контейнер. */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
