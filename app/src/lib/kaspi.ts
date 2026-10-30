import { prisma } from "@/lib/prisma";
import { sendRegistrationConfirmationEmail } from "@/lib/mailer";
import { notifyFromRegistration } from "@/lib/userMessages";
import { parsePaidInvoiceAt, withPaidInvoiceAt } from "@/lib/invoiceDisplay";
import { assignPaidBibInTx, ensurePaidBibNumber } from "@/lib/bibNumbers";
import { registrationPaymentAmount } from "@/lib/paymentAmount";
import {
  decidePaymentTransition,
  PaymentVerificationError,
  showPaymentSimulation,
  simulationGate,
} from "@/lib/apipayPayment";

export function isKaspiConfigured() {
  return Boolean(process.env.APIPAY_API_KEY);
}

// Симуляция запрещена в production. В песочнице она включается только серверными
// ALLOW_TEST_PAYMENTS=true и APIPAY_SANDBOX=true, плюс is_sandbox самого счёта.
export function isTestPaymentModeEnabled() {
  return simulationGate(process.env) !== "forbidden";
}

export function canShowPaymentSimulation(invoiceIsSandbox: boolean | null) {
  return showPaymentSimulation(invoiceIsSandbox, process.env);
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
  paidAmount?: number,
  paidAt?: Date,
  options?: { trustedTestConfirmation?: boolean; complimentary?: boolean; currency?: string | null },
) {
  const paidAtValue = paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : new Date();
  const txResult = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Registration" WHERE "id" = ${registrationId} FOR UPDATE`;
    const registration = await tx.registration.findUnique({
      where: { id: registrationId },
      include: { distance: true, event: { select: { transferPrice: true } } },
    });
    if (!registration || (ownerUserId && registration.userId !== ownerUserId)) {
      return null;
    }
    const invoiceId = paidInvoiceId || registration.kaspiOrderId;
    const decision = decidePaymentTransition({
      status: registration.status,
      expectedAmount: registrationPaymentAmount(registration),
      paidAmount,
      trustedTestConfirmation: options?.trustedTestConfirmation,
      complimentary: options?.complimentary,
      currentInvoiceId: registration.kaspiOrderId,
      paidInvoiceId: paidInvoiceId ?? null,
      currency: options?.currency,
    });
    if (
      decision === "amount_mismatch" ||
      decision === "currency_mismatch" ||
      decision === "invoice_mismatch" ||
      decision === "simulation_forbidden" ||
      decision === "not_paid"
    ) {
      throw new PaymentVerificationError(decision);
    }
    const paidInvoiceAt = withPaidInvoiceAt(registration.paidInvoiceAt, invoiceId, paidAtValue);
    if (decision === "replay") {
      const previous = parsePaidInvoiceAt(registration.paidInvoiceAt);
      if (JSON.stringify(previous) !== JSON.stringify(paidInvoiceAt)) {
        await tx.registration.update({
          where: { id: registrationId },
          data: { paidInvoiceAt },
        });
      }
      return { reg: registration, justPaid: false, invoiceId, paidInvoiceIds: registration.paidInvoiceIds };
    }
    if (decision !== "pay") return null;

    const claimed = await tx.registration.updateMany({
      where: {
        id: registrationId,
        status: "RESERVED",
        ...(ownerUserId ? { userId: ownerUserId } : {}),
      },
      data: {
        status: "PAID",
        reservedUntil: null,
        paidInvoiceAt,
      },
    });
    if (claimed.count !== 1) {
      const current = await tx.registration.findUnique({ where: { id: registrationId } });
      if (current?.status === "PAID") {
        return { reg: current, justPaid: false, invoiceId, paidInvoiceIds: current.paidInvoiceIds };
      }
      return null;
    }
    const updated = await tx.registration.findUniqueOrThrow({ where: { id: registrationId } });
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
