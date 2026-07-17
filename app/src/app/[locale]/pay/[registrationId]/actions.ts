"use server";

import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { isTestPaymentModeEnabled, confirmPayment } from "@/lib/kaspi";

// Доступно только пока isTestPaymentModeEnabled() — как только Kaspi настроен (или это прод),
// оплату подтверждает исключительно вебхук Kaspi (T15), не эта кнопка. Бросаем, а не молча
// выходим: это dev-заглушка, и если сюда дошёл вызов при выключенном тестовом режиме или
// на чужой регистрации — это баг, который должен быть виден в логах, а не проглочен.
export async function simulatePaymentAction(locale: string, registrationId: string) {
  if (!isTestPaymentModeEnabled()) {
    throw new Error("simulatePaymentAction: test payment mode is disabled");
  }

  const userId = await requireUserId();
  if (!userId) {
    throw new Error("simulatePaymentAction: no session");
  }

  const registration = await confirmPayment(registrationId, userId);
  if (!registration) {
    throw new Error("simulatePaymentAction: registration not found or not owned by user");
  }

  redirect({ href: `/pay/${registrationId}`, locale });
}
