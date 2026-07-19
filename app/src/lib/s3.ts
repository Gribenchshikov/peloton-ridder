import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "ridder",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "ridder_secret_123",
  },
  // MinIO требует path-style (bucket в пути, а не субдомене)
  forcePathStyle: true,
});

export const S3_BUCKET = process.env.S3_BUCKET ?? "ridder";

// Публичный URL для файлов в публичном бакете / с публичным ACL
export function getPublicUrl(key: string): string {
  const endpoint = (process.env.S3_ENDPOINT ?? "http://localhost:9000").replace(/\/$/, "");
  return `${endpoint}/${S3_BUCKET}/${key}`;
}

// Presigned URL для загрузки файла напрямую из браузера (expires 15 min)
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 900,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

// Presigned URL для скачивания приватного файла (expires 1 hour)
export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

// Ключи по соглашению:
//   avatars/{userId}.{ext}          — фото профиля участника
//   covers/{eventId}.{ext}          — обложка события
//   regulations/{eventId}.pdf       — регламент забега
export const s3Keys = {
  avatar: (userId: string, ext: string) => `avatars/${userId}.${ext}`,
  cover: (eventId: string, ext: string) => `covers/${eventId}.${ext}`,
  regulation: (eventId: string) => `regulations/${eventId}.pdf`,
};
