"use server";

import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { isTestPaymentModeEnabled, confirmPayment } from "@/lib/kaspi";
import { prisma } from "@/lib/prisma";

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

export async function cancelReservationAction(locale: string, registrationId: string) {
  const userId = await requireUserId();
  if (!userId) throw new Error("cancelReservationAction: no session");

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      userId: true,
      status: true,
      event: { select: { year: true, race: { select: { slug: true } } } },
    },
  });

  if (!registration || registration.userId !== userId) throw new Error("cancelReservationAction: not found");

  const backHref = `/events/${registration.event.race.slug}/${registration.event.year}`;

  if (registration.status === "RESERVED") {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { status: "CANCELLED", reservedUntil: null },
    });
  }

  redirect({ href: backHref, locale });
}
