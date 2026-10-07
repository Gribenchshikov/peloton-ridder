import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

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

let bucketReady: Promise<void> | null = null;

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return;
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: BUCKET,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { AWS: ["*"] },
              Action: ["s3:GetObject"],
              Resource: [`arn:aws:s3:::${BUCKET}/*`],
            },
          ],
        }),
      }),
    );
  }
}

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
  const url = await putPublicObject(key, body, file.type);
  return { url };
}

export async function putPublicObject(key: string, body: Buffer, contentType: string): Promise<string> {
  bucketReady ??= ensureBucket().catch((err) => {
    bucketReady = null;
    throw err;
  });
  await bucketReady;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );

  return `/uploads/${key}`;
}

export type PublicObject = {
  body: ReadableStream;
  contentType: string;
  contentLength?: number;
};

function isS3NotFound(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return (
    err.name === "NoSuchKey" ||
    err.name === "NotFound" ||
    err.Code === "NoSuchKey" ||
    err.$metadata?.httpStatusCode === 404
  );
}

export async function getPublicObject(key: string): Promise<PublicObject | null> {
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    if (!obj.Body) return null;
    return {
      body: obj.Body.transformToWebStream(),
      contentType: obj.ContentType ?? "application/octet-stream",
      contentLength: obj.ContentLength,
    };
  } catch (error) {
    if (isS3NotFound(error)) return null;
    throw error;
  }
}
