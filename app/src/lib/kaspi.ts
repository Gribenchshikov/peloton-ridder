import { prisma } from "@/lib/prisma";
import { sendRegistrationConfirmationEmail } from "@/lib/mailer";

// Пока нет реального мерчанта (см. .env.example) — вместо вызова Kaspi API работаем
// в тестовом режиме: страница оплаты показывает баннер и кнопку «Симулировать оплату»
// вместо реальных диплинка/QR. Как только KASPI_MERCHANT_ID/KASPI_API_KEY заполнены
// боевыми значениями, тестовая кнопка перестаёт рендериться (см. pay/actions.ts).
export function isKaspiConfigured() {
  return Boolean(process.env.KASPI_MERCHANT_ID) && Boolean(process.env.KASPI_API_KEY);
}

// Отдельный от isKaspiConfigured() флаг для самой кнопки «Симулировать оплату» —
// намеренно требует ОБА условия: нет боевых ключей И явно включённый ALLOW_TEST_PAYMENTS.
// NODE_ENV тут не годится — `next start` (в том числе локально при проверке прод-сборки)
// сам выставляет NODE_ENV=production, так что он не отличает "реальный деплой" от
// "разработчик гоняет прод-сборку у себя". Явный флаг убирает эту двусмысленность: чтобы
// кнопка утекла в реальный прод, кто-то должен был осознанно оставить ALLOW_TEST_PAYMENTS=true
// в боевом окружении — недостающий/забытый KASPI_MERCHANT_ID сам по себе этого не сделает.
export function isTestPaymentModeEnabled() {
  return !isKaspiConfigured() && process.env.ALLOW_TEST_PAYMENTS === "true";
}

// Единая точка, где Registration становится PAID и получает номер участника.
// Вызывается ТОЛЬКО серверно — из вебхука Kaspi (T15) либо из тестовой кнопки-заглушки
// (T14, доступна только пока isTestPaymentModeEnabled() === true). Идемпотентна: повторный
// вызов на уже оплаченной регистрации ничего не меняет — вебхуки могут дублироваться.
// ownerUserId необязателен — реальный вебхук Kaspi его не знает, а тестовая кнопка
// передаёт его, чтобы проверка владения тоже была внутри транзакции, без отдельного чтения.
export async function confirmPayment(registrationId: string, ownerUserId?: string) {
  const txResult = await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: { distance: true },
    });
    if (!registration || (ownerUserId && registration.userId !== ownerUserId)) {
      return null;
    }
    if (registration.status === "PAID") {
      return { reg: registration, justPaid: false };
    }

    let bibNumber: number | undefined;
    if (registration.distance && registration.distanceId) {
      const taken = await tx.registration.findMany({
        where: { distanceId: registration.distanceId, status: "PAID" },
        select: { bibNumber: true },
      });
      const takenNumbers = new Set(taken.map((r) => r.bibNumber));
      bibNumber = registration.distance.bibRangeStart;
      while (takenNumbers.has(bibNumber) && bibNumber <= registration.distance.bibRangeEnd) {
        bibNumber++;
      }
    }

    const updated = await tx.registration.update({
      where: { id: registrationId },
      data: { status: "PAID", ...(bibNumber !== undefined ? { bibNumber } : {}) },
    });

    // Если оплатили transfer-only регистрацию — проставляем includesTransfer на основной слот
    if (registration.isTransferOnly) {
      await tx.registration.updateMany({
        where: {
          userId: registration.userId,
          eventId: registration.eventId,
          isTransferOnly: false,
          status: "PAID",
          includesTransfer: false,
        },
        data: { includesTransfer: true },
      });
    }

    return { reg: updated, justPaid: true };
  });

  if (!txResult) return null;

  if (txResult.justPaid) {
    sendConfirmationEmail(txResult.reg.id).catch((e) => console.error("[kaspi] email error:", e));
  }

  return txResult.reg;
}

async function sendConfirmationEmail(registrationId: string) {
  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      bibNumber: true,
      user: { select: { email: true, firstName: true, lastName: true } },
      event: {
        select: {
          year: true,
          dateISO: true,
          location: true,
          race: { select: { name: true } },
        },
      },
      distance: { select: { name: true } },
    },
  });
  if (!reg || reg.bibNumber === null) return;

  const name = `${reg.user.firstName} ${reg.user.lastName}`.trim();
  const raceName = `${reg.event.race.name} ${reg.event.year}`;

  await sendRegistrationConfirmationEmail(
    reg.user.email,
    name,
    raceName,
    reg.distance?.name ?? "Трансфер",
    reg.bibNumber,
    reg.event.dateISO,
    reg.event.location,
    registrationId,
  );
}
