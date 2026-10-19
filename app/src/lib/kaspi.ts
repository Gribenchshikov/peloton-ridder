import { prisma } from "@/lib/prisma";
import { sendRegistrationConfirmationEmail } from "@/lib/mailer";
import { notifyFromRegistration } from "@/lib/userMessages";
import { withPaidInvoiceAt } from "@/lib/invoiceDisplay";
import { assignPaidBibInTx, ensurePaidBibNumber } from "@/lib/bibNumbers";

// Оплата идёт через ApiPay (Kaspi QR + ссылка). Пока APIPAY_API_KEY не задан,
// страница оплаты может показать кнопку «Симулировать оплату» при ALLOW_TEST_PAYMENTS.
export function isKaspiConfigured() {
  return Boolean(process.env.APIPAY_API_KEY);
}

// Отдельный от isKaspiConfigured() флаг для самой кнопки «Симулировать оплату» —
// намеренно требует ОБА условия: нет боевых ключей И явно включённый ALLOW_TEST_PAYMENTS.
// NODE_ENV тут не годится — `next start` (в том числе локально при проверке прод-сборки)
// сам выставляет NODE_ENV=production, так что он не отличает "реальный деплой" от
// "разработчик гоняет прод-сборку у себя". Явный флаг убирает эту двусмысленность: чтобы
// кнопка утекла в реальный прод, кто-то должен был осознанно оставить ALLOW_TEST_PAYMENTS=true
// в боевом окружении — недостающий APIPAY_API_KEY сам по себе этого не сделает.
export function isTestPaymentModeEnabled() {
  return !isKaspiConfigured() && process.env.ALLOW_TEST_PAYMENTS === "true";
}

// Единая точка, где Registration становится PAID и получает номер участника.
// Вызывается ТОЛЬКО серверно — из вебхука Kaspi (T15) либо из тестовой кнопки-заглушки
// (T14, доступна только пока isTestPaymentModeEnabled() === true). Идемпотентна: повторный
// вызов на уже оплаченной регистрации ничего не меняет — вебхуки могут дублироваться.
// ownerUserId необязателен — реальный вебхук Kaspi его не знает, а тестовая кнопка
// передаёт его, чтобы проверка владения тоже была внутри транзакции, без отдельного чтения.
function withPaidInvoiceId(
  existing: string[],
  invoiceId: string | null | undefined,
): { paidInvoiceIds?: { push: string } } {
  if (!invoiceId || existing.includes(invoiceId)) return {};
  return { paidInvoiceIds: { push: invoiceId } };
}

export async function confirmPayment(
  registrationId: string,
  ownerUserId?: string,
  paidInvoiceId?: string,
  _paidAmount?: number,
  paidAt?: Date,
) {
  const paidAtValue = paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : new Date();
  const txResult = await prisma.$transaction(async (tx) => {
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: { distance: true, event: { select: { transferPrice: true } } },
    });
    if (!registration || (ownerUserId && registration.userId !== ownerUserId)) {
      return null;
    }
    const invoiceId = paidInvoiceId || registration.kaspiOrderId;
    const paidInvoiceAt = withPaidInvoiceAt(registration.paidInvoiceAt, invoiceId, paidAtValue);
    if (registration.status === "PAID") {
      await tx.registration.update({
        where: { id: registrationId },
        data: { paidInvoiceAt },
      });
      return { reg: registration, justPaid: false, invoiceId, paidInvoiceIds: registration.paidInvoiceIds };
    }
    // Возвращённую или отменённую регистрацию нельзя снова пометить оплаченной
    // по старому счёту — иначе в списке участников снова светится «Оплачено».
    if (registration.status !== "RESERVED") {
      return null;
    }

    const updated = await tx.registration.update({
      where: { id: registrationId },
      data: {
        status: "PAID",
        reservedUntil: null,
        paidInvoiceAt,
      },
    });
    const bibNumber = await assignPaidBibInTx(tx, updated);

    return {
      reg: { ...updated, bibNumber },
      justPaid: true,
      invoiceId,
      paidInvoiceIds: registration.paidInvoiceIds,
    };
  });

  if (!txResult) return null;

  try {
    const extra = withPaidInvoiceId(txResult.paidInvoiceIds, txResult.invoiceId);
    if (extra.paidInvoiceIds) {
      await prisma.registration.update({ where: { id: registrationId }, data: extra });
    }
  } catch (error) {
    console.error("[kaspi] paidInvoiceIds update failed:", registrationId, error);
  }

  if (txResult.justPaid) {
    if (!txResult.reg.isTransferOnly && txResult.reg.bibNumber == null) {
      await ensurePaidBibNumber(txResult.reg.id).catch((error) => {
        console.error("[kaspi] bib assign failed:", registrationId, error);
      });
    }
    sendConfirmationEmail(txResult.reg.id).catch((e) => console.error("[kaspi] email error:", e));
    if (!txResult.reg.isTransferOnly) {
      await notifyFromRegistration(txResult.reg.id, "REGISTRATION");
    }
    await notifyFromRegistration(txResult.reg.id, "PAYMENT");
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
