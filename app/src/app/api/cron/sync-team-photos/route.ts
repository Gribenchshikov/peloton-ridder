import { NextResponse } from "next/server";
import { syncTeamPhotosToStorage } from "@/lib/syncTeamPhotos";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("Authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await syncTeamPhotosToStorage();
  return NextResponse.json(result);
}
