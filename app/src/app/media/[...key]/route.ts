import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { getPublicObject } from "@/lib/storage";

const KEY_RE = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,240}$/;

export const runtime = "nodejs";

function contentTypeFromExt(key: string): string {
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".svg")) return "image/svg+xml";
  if (key.endsWith(".pdf")) return "application/pdf";
  if (key.endsWith(".woff2")) return "font/woff2";
  if (key.endsWith(".gpx")) return "application/gpx+xml";
  return "image/jpeg";
}

async function fromPublicDir(key: string): Promise<Buffer | null> {
  const file = join(process.cwd(), "public", "uploads", ...key.split("/"));
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await context.params;
  const key = segments.join("/");
  if (!key || key.includes("..") || !KEY_RE.test(key)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const obj = await getPublicObject(key);
    if (obj) {
      const headers = new Headers({
        "Content-Type": obj.contentType,
        "Cache-Control": "public, max-age=86400",
      });
      if (obj.contentLength != null) headers.set("Content-Length", String(obj.contentLength));
      return new NextResponse(obj.body, { headers });
    }
  } catch {
    // MinIO down — fall through to local public/uploads (dev)
  }

  const disk = await fromPublicDir(key);
  if (!disk) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(disk), {
    headers: {
      "Content-Type": contentTypeFromExt(key),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
