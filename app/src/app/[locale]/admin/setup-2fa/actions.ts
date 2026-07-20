"use server";

import { generateSecret, verifySync } from "otplib";
import { generateTOTP } from "@otplib/uri";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";

export async function generateTotpSetupAction(): Promise<{
  qrDataUrl: string;
  manualKey: string;
}> {
  const adminId = await requireAdminId();
  if (!adminId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { email: true },
  });
  if (!user) throw new Error("User not found");

  const secret = generateSecret();
  const otpauthUrl = generateTOTP({ label: user.email, issuer: "Ridder", secret });
  const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

  // Save pending secret (totpEnabledAt stays null until confirmed)
  await prisma.user.update({
    where: { id: adminId },
    data: { totpSecret: secret, totpEnabledAt: null },
  });

  return { qrDataUrl, manualKey: secret };
}

type ConfirmState = { error?: string; success?: boolean };

export async function confirmSetup2faAction(
  _prevState: ConfirmState,
  formData: FormData
): Promise<ConfirmState> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "Необходима авторизация" };

  const code = (formData.get("code") as string | null)?.trim() ?? "";
  if (!/^\d{6}$/.test(code)) return { error: "Введите 6-значный код" };

  const user = await prisma.user.findUnique({
    where: { id: adminId },
    select: { totpSecret: true },
  });
  if (!user?.totpSecret) return { error: "Сначала отсканируйте QR-код" };

  const result = verifySync({ token: code, secret: user.totpSecret });
  if (!result.valid) return { error: "Неверный код. Проверьте время на устройстве и попробуйте снова" };

  await prisma.user.update({
    where: { id: adminId },
    data: { totpEnabledAt: new Date() },
  });

  const locale = await getLocale();
  redirect({ href: "/admin", locale });
  return { success: true };
}
