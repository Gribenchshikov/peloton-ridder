"use server";

import { NextResponse } from "next/server";
import { requireAdminId } from "@/lib/session";
import { getEventWithRegistrationsBySlug } from "@/lib/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string; slug: string; year: string }> },
) {
  const { locale, slug, year } = await params;

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

  const rows = [
    ["№", "Имя", "Фамилия", "Email", "Телефон", "Дистанция", "Км", "Статус", "Стартовый номер", "Дата регистрации", "Беговой клуб", "Промокод", "Скидка (₸)"],
    ...event.registrations.map((r) => [
      r.bibNumber ?? "",
      r.user.firstName ?? "",
      r.user.lastName ?? "",
      r.user.email,
      r.user.phone ?? "",
      r.distance?.name ?? "Трансфер",
      r.distance?.km ?? "",
      r.status === "PAID" ? "Оплачено" : r.status === "CANCELLED" ? "Отменено" : "Бронь",
      r.bibNumber ?? "",
      new Date(r.createdAt).toLocaleDateString("ru-RU"),
      r.runningClub?.name ?? "",
      r.promoCode?.code ?? "",
      r.discountAmount ?? 0,
    ]),
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
