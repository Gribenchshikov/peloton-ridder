import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  // GPX tracks (Garmin, Strava, Komoot export different MIME types for the same format)
  "application/gpx+xml",
  "application/octet-stream",
  "text/xml",
  "application/xml",
]);
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB (GPX files can be large)

export type SaveResult = { url: string } | { error: "invalidType" | "tooLarge" };

/**
 * Сохраняет загруженный файл и возвращает публичный URL.
 *
 * Дев:  public/uploads/<folder>/<uuid>.ext  →  /uploads/<folder>/<uuid>.ext
 * Прод: $UPLOAD_DIR/<folder>/<uuid>.ext     →  $UPLOAD_URL/<folder>/<uuid>.ext
 *
 * Для Nginx на проде добавить в nginx.conf:
 *   location /uploads/ { root /var/www/ridder; }
 * и в .env:
 *   UPLOAD_DIR=/var/www/ridder/uploads
 *   UPLOAD_URL=https://ridder.kz/uploads
 */
export async function saveFile(file: File, folder: string): Promise<SaveResult> {
  if (!ALLOWED_TYPES.has(file.type)) return { error: "invalidType" };
  if (file.size > MAX_BYTES) return { error: "tooLarge" };

  const isGpx =
    file.type === "application/gpx+xml" ||
    file.type === "text/xml" ||
    file.type === "application/xml" ||
    file.type === "application/octet-stream" ||
    file.name?.endsWith(".gpx");
  const ext = isGpx
    ? "gpx"
    : file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/svg+xml"
          ? "svg"
          : "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;

  const uploadDir = process.env.UPLOAD_DIR
    ? path.join(process.env.UPLOAD_DIR, folder)
    : path.join(process.cwd(), "public", "uploads", folder);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

  const base = process.env.UPLOAD_URL?.replace(/\/$/, "") ?? "/uploads";
  return { url: `${base}/${folder}/${filename}` };
}
