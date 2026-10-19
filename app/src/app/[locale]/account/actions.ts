"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { safeRelativePath } from "@/lib/safeRedirect";
import { CancelReason, RefundType } from "@/generated/prisma/client";
import { notifyWaitlistForDistance } from "@/lib/waitlist";
import { sendRefundRequestEmail } from "@/lib/mailer";
import { findPaidInvoiceForOrder, isApipayConfigured } from "@/lib/apipay";
import { refundRequestAmount } from "@/lib/paymentAmount";

const TSHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

const LATIN_NAME = /^[A-Za-z][A-Za-z \-]*$/;

const ProfileSchema = z.object({
  firstName: z.string().trim().min(2).max(100).regex(LATIN_NAME, "latin_only"),
  lastName: z.string().trim().min(2).max(100).regex(LATIN_NAME, "latin_only"),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().length(3).optional(),
  phone: z.string().trim().max(30).optional(),
  tshirtSize: z.enum(TSHIRT_SIZES).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type ProfileState = {
  error?: string;
  success?: boolean;
  tshirtSize?: string;
};

export async function updateProfileAction(
  locale: string,
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const userId = await requireUserId();
  if (!userId) {
    return { error: "unauthorized" };
  }

  const parsed = ProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    city: formData.get("city") || undefined,
    country: formData.get("country") || undefined,
    phone: formData.get("phone") || undefined,
    tshirtSize: formData.get("tshirtSize") || undefined,
    birthDate: formData.get("birthDate") || undefined,
  });

  if (!parsed.success) {
    const isLatinOnly = parsed.error.issues.some((i) => i.message === "latin_only");
    if (isLatinOnly) return { error: "name_latin_only" };
    return { error: "invalid" };
  }

  const { birthDate, country, ...rest } = parsed.data;
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...rest,
      country: country ?? null,
      birthDate: birthDate ? new Date(birthDate) : undefined,
    },
  });

  // Если сюда пришли по ссылке «Изменить» с другой страницы (например, со страницы
  // регистрации на забег) — после сохранения возвращаем туда, а не оставляем на /account.
  const callbackUrl = safeRelativePath(formData.get("callbackUrl"));
  if (callbackUrl) {
    return redirect({ href: callbackUrl, locale });
  }

  revalidatePath("/[locale]/account", "page");
  return { success: true, tshirtSize: rest.tshirtSize ?? "" };
}

const VALID_CANCEL_REASONS = Object.values(CancelReason);

export type CancelRegistrationState = { error?: string; success?: boolean };

export async function userCancelRegistrationAction(
  _prevState: CancelRegistrationState,
  formData: FormData,
): Promise<CancelRegistrationState> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthorized" };

  const registrationId = formData.get("registrationId");
  const reason = formData.get("cancelReason");
  const comment = formData.get("cancelComment");

  if (typeof registrationId !== "string") return { error: "invalid" };
  if (typeof reason !== "string" || !VALID_CANCEL_REASONS.includes(reason as CancelReason)) return { error: "invalid_reason" };

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { userId: true, distanceId: true, status: true, event: { select: { cancellationDeadline: true } } },
  });

  if (!reg || reg.userId !== userId) return { error: "not_found" };
  if (reg.status === "CANCELLED") return { error: "already_cancelled" };
  if (reg.status !== "RESERVED" && reg.status !== "PAID") return { error: "inactive" };
  if (new Date() > reg.event.cancellationDeadline) return { error: "deadline_passed" };

  await prisma.registration.update({
    where: { id: registrationId },
    data: {
      status: "CANCELLED",
      reservedUntil: null,
      bibNumber: null,
      cancelReason: reason as CancelReason,
      cancelComment: typeof comment === "string" && comment.trim() ? comment.trim() : null,
    },
  });

  if (reg.distanceId) {
    void notifyWaitlistForDistance(reg.distanceId);
  }

  revalidatePath("/[locale]/account", "page");
  revalidatePath("/[locale]/account/history", "page");
  return { success: true };
}

export type RequestRefundState = { error?: string; success?: boolean; type?: RefundType; types?: RefundType[] };

const VALID_REFUND_TYPES: RefundType[] = ["SLOT", "TRANSFER"];
const BLOCKING_REFUND_STATUSES = ["PENDING"] as const;

function parseRefundTypes(formData: FormData): RefundType[] {
  const raw = formData.getAll("refundType");
  const unique = new Set<RefundType>();
  for (const value of raw) {
    if (typeof value === "string" && VALID_REFUND_TYPES.includes(value as RefundType)) {
      unique.add(value as RefundType);
    }
  }
  return [...unique];
}

export async function requestRefundAction(
  _prevState: RequestRefundState,
  formData: FormData,
): Promise<RequestRefundState> {
  const userId = await requireUserId();
  if (!userId) return { error: "unauthorized" };

  const registrationId = formData.get("registrationId");
  const types = parseRefundTypes(formData);
  const reason = formData.get("reason");

  if (typeof registrationId !== "string") return { error: "invalid" };
  if (types.length === 0) return { error: "nothing_selected" };

  const reg = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: {
      userId: true,
      status: true,
      includesTransfer: true,
      isTransferOnly: true,
      discountAmount: true,
      kitPickedUpAt: true,
      kaspiOrderId: true,
      distance: { select: { name: true, price: true } },
      event: {
        select: {
          cancellationDeadline: true,
          year: true,
          transferPrice: true,
          race: { select: { name: true } },
        },
      },
      refundRequests: {
        where: { status: { in: [...BLOCKING_REFUND_STATUSES] } },
        select: { id: true, type: true },
      },
    },
  });

  if (!reg || reg.userId !== userId) return { error: "not_found" };
  if (reg.status !== "PAID") return { error: "not_paid" };
  if (new Date() > reg.event.cancellationDeadline) return { error: "deadline_passed" };
  if (types.includes("TRANSFER") && !reg.includesTransfer && !reg.isTransferOnly) return { error: "no_transfer" };
  if (types.includes("SLOT") && (reg.isTransferOnly || !reg.distance)) return { error: "no_slot" };
  if (types.includes("SLOT") && reg.kitPickedUpAt) return { error: "slot_locked" };

  const pendingTypes = new Set(reg.refundRequests.map((r) => r.type));
  const toCreate = types.filter((type) => !pendingTypes.has(type));
  if (toCreate.length === 0) return { error: "already_requested" };

  const reasonText = typeof reason === "string" && reason.trim() ? reason.trim() : null;
  if (isApipayConfigured()) {
    try {
      const invoice = await findPaidInvoiceForOrder(registrationId, reg.kaspiOrderId);
      if (invoice && reg.kaspiOrderId !== String(invoice.id)) {
        await prisma.registration.update({
          where: { id: registrationId },
          data: { kaspiOrderId: String(invoice.id) },
        });
      }
    } catch (error) {
      console.error("[apipay] restore invoice before refund request failed:", error);
    }
  }
  await prisma.refundRequest.createMany({
    data: toCreate.map((type) => ({
      registrationId,
      type,
      reason: reasonText,
      amount: refundRequestAmount(reg, type),
      invoiceId: reg.kaspiOrderId,
    })),
  });

  const [adminEmails, user] = await Promise.all([
    prisma.user.findMany({ where: { isAdmin: true }, select: { email: true } }).then((u) => u.map((x) => x.email)),
    prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } }),
  ]);

  if (user && adminEmails.length > 0) {
    for (const type of toCreate) {
        void sendRefundRequestEmail(
        adminEmails,
        `${user.firstName} ${user.lastName}`,
        user.email,
        `${reg.event.race.name} ${reg.event.year}`,
        reg.distance?.name ?? "Трансфер",
        type,
        reasonText,
        registrationId,
        reg.kaspiOrderId,
      );
    }
  }

  revalidatePath("/[locale]/account", "page");
  revalidatePath("/[locale]/account/history", "page");
  revalidatePath("/[locale]/admin/refunds", "page");
  revalidatePath("/", "layout");
  return { success: true, type: toCreate[0], types: toCreate };
}
