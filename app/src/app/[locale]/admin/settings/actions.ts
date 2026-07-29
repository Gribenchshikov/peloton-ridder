"use server";

import { verifySync } from "otplib";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";

const ALLOWED_FONTS = ["unbounded", "oswald", "bebas-neue", "impact", "georgia", "custom"] as const;
type FontKey = (typeof ALLOWED_FONTS)[number];

export async function saveFontAction(font: string): Promise<{ ok: boolean }> {
  const adminId = await requireAdminId();
  if (!adminId) return { ok: false };
  if (!ALLOWED_FONTS.includes(font as FontKey)) return { ok: false };
  await prisma.siteSetting.upsert({
    where: { key: "display_font" },
    create: { key: "display_font", value: font },
    update: { value: font },
  });
  return { ok: true };
}

export async function uploadFontAction(
  formData: FormData,
): Promise<{ ok: boolean; name?: string; css?: string; error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { ok: false, error: "unauthorized" };

  const file = formData.get("file");
  const rawName = ((formData.get("name") as string) || "").trim();
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "noFile" };
  if (!file.name.endsWith(".woff2")) return { ok: false, error: "invalidType" };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "tooLarge" };

  const fontName = rawName || file.name.replace(/\.woff2$/i, "");

  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "ridder",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "ridder_secret_123",
    },
    forcePathStyle: true,
  });
  const bucket = process.env.S3_BUCKET ?? "ridder";
  const key = `fonts/${crypto.randomUUID()}.woff2`;
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: "font/woff2",
    }),
  );
  const base =
    process.env.UPLOAD_URL?.replace(/\/$/, "") ??
    `${(process.env.S3_ENDPOINT ?? "http://localhost:9000").replace(/\/$/, "")}/${bucket}`;
  const url = `${base}/${key}`;
  const css = `'${fontName}', sans-serif`;

  await Promise.all([
    prisma.siteSetting.upsert({ where: { key: "custom_font_url" }, create: { key: "custom_font_url", value: url }, update: { value: url } }),
    prisma.siteSetting.upsert({ where: { key: "custom_font_name" }, create: { key: "custom_font_name", value: fontName }, update: { value: fontName } }),
    prisma.siteSetting.upsert({ where: { key: "custom_font_css" }, create: { key: "custom_font_css", value: css }, update: { value: css } }),
    prisma.siteSetting.upsert({ where: { key: "display_font" }, create: { key: "display_font", value: "custom" }, update: { value: "custom" } }),
  ]);

  return { ok: true, name: fontName, css };
}

export async function saveLegalDocAction(key: string, content: string): Promise<{ ok: boolean }> {
  const adminId = await requireAdminId();
  if (!adminId) return { ok: false };
  if (!key.startsWith("legal_")) return { ok: false };
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: content },
    update: { value: content },
  });
  return { ok: true };
}

type ToggleState = { error?: string; open?: boolean };

export async function toggleRegistrationsAction(
  _prevState: ToggleState,
  formData: FormData
): Promise<ToggleState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "Необходима авторизация" };

  const code = (formData.get("totpCode") as string | null)?.trim() ?? "";
  if (!/^\d{6}$/.test(code)) return { error: "Введите 6-значный код из приложения" };

  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { totpSecret: true },
  });

  if (!user?.totpSecret) return { error: "2FA не настроена" };

  const result = verifySync({ token: code, secret: user.totpSecret });
  if (!result.valid) return { error: "Неверный код. Попробуйте снова" };

  const current = await prisma.siteSetting.findUnique({ where: { key: "registrations_open" } });
  const currentlyOpen = current?.value !== "false";
  const newValue = currentlyOpen ? "false" : "true";

  await prisma.siteSetting.upsert({
    where: { key: "registrations_open" },
    create: { key: "registrations_open", value: newValue },
    update: { value: newValue },
  });

  return { open: newValue === "true" };
}
