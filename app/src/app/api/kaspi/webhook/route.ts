import { NextResponse } from "next/server";

// T15: настоящий вебхук Kaspi. Пока нет боевого мерчанта и документированного
// контракта (payload, схема подписи) — не принимаем и не доверяем никаким телам
// запроса. confirmPayment() в @/lib/kaspi уже готова и именно её вызовет этот
// хендлер после того, как появится возможность проверить подпись запроса.
export async function POST() {
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
