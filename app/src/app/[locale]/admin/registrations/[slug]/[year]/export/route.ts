"use server";

import { NextResponse } from "next/server";
import { requireAdminId } from "@/lib/session";
import { getEventWithRegistrationsBySlug } from "@/lib/queries";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ locale: string; slug: string; year: string }> },
) {
  const { slug, year } = await params;

  const adminId = await requireAdminId();
  if (!adminId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const yearNum = Number(year);
  if (!Number.isInteger(yearNum)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const event = await getEventWithRegistrationsBySlug(slug, yearNum);
  if (!event) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get("status"); // PAID | RESERVED | CANCELLED
  const distanceParam = url.searchParams.get("distanceId"); // id | TRANSFER_ONLY
  const transferParam = url.searchParams.get("transfer"); // yes | no

  const registrations = event.registrations.filter((r) => {
    if (statusParam && r.status !== statusParam) return false;
    if (distanceParam) {
      if (distanceParam === "TRANSFER_ONLY") {
        if (!r.isTransferOnly) return false;
      } else {
        if (r.distance?.id !== distanceParam) return false;
      }
    }
    if (transferParam === "yes" && !r.includesTransfer && !r.isTransferOnly) return false;
    if (transferParam === "no" && (r.includesTransfer || r.isTransferOnly)) return false;
    return true;
  });

  const rows = [
    ["№", "Имя", "Фамилия", "Email", "Телефон", "Дистанция", "Км", "Трансфер", "Статус", "Причина отмены", "Комментарий отмены", "Стартовый номер", "Дата регистрации", "Беговой клуб", "Промокод", "Скидка (₸)"],
    ...registrations.map((r) => {
      const cancelLabels: Record<string, string> = {
        INJURY: "Травма / болезнь",
        CANT_ATTEND: "Не смогу приехать",
        FINANCIAL: "Финансовые причины",
        FAMILY: "Семейные обстоятельства",
        CONFLICT: "Другое мероприятие",
        NOT_READY: "Не готов физически",
        DEFER: "Перенесу на след. год",
        OTHER: "Другое",
      };
      return [
        r.bibNumber ?? "",
        r.user.firstName ?? "",
        r.user.lastName ?? "",
        r.user.email,
        r.user.phone ?? "",
        r.isTransferOnly ? "Только трансфер" : (r.distance?.name ?? ""),
        r.isTransferOnly ? "" : (r.distance?.km ?? ""),
        r.includesTransfer || r.isTransferOnly ? "Да" : "Нет",
        r.status === "PAID" ? "Оплачено" : r.status === "CANCELLED" ? "Отменено" : "Бронь",
        r.cancelReason ? (cancelLabels[r.cancelReason] ?? r.cancelReason) : "",
        r.cancelComment ?? "",
        r.bibNumber ?? "",
        new Date(r.createdAt).toLocaleDateString("ru-RU"),
        r.runningClub?.name ?? "",
        r.promoCode?.code ?? "",
        r.discountAmount ?? 0,
      ];
    }),
  ];

  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(","),
    )
    .join("\r\n");

  const filename = `participants-${slug}-${year}.csv`;

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
