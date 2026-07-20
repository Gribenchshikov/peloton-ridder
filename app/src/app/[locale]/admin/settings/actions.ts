"use server";

import { verifySync } from "otplib";
import { prisma } from "@/lib/prisma";
import { requireAdminId } from "@/lib/session";

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
