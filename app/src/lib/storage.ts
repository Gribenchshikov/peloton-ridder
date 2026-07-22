import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "ridder",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "ridder_secret_123",
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET ?? "ridder";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/gpx+xml",
  "application/octet-stream",
  "text/xml",
  "application/xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_BYTES = 20 * 1024 * 1024;

export type SaveResult = { url: string } | { error: "invalidType" | "tooLarge" };

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
          : file.type === "application/pdf"
            ? "pdf"
            : file.type === "application/msword"
              ? "doc"
              : file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ? "docx"
                : "jpg";

  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: file.type,
    }),
  );

  // На проде: UPLOAD_URL=https://ridder.kz/uploads (Nginx проксирует в MinIO)
  // В dev: прямой доступ к MinIO на :9000
  const base = process.env.UPLOAD_URL?.replace(/\/$/, "")
    ?? `${(process.env.S3_ENDPOINT ?? "http://localhost:9000").replace(/\/$/, "")}/${BUCKET}`;

  return { url: `${base}/${key}` };
}
