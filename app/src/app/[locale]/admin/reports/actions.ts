"use server";

import { revalidatePath } from "next/cache";
import { requireAdminId } from "@/lib/session";
import { upsertSiteSetting } from "@/lib/queries";

export type PackItem = { id: string; name: string; price: number };
export type LineEntry = { id: string; label: string; amount: number };
export type FinancialData = {
  packItems: PackItem[];
  expenses: LineEntry[];
  incomes: LineEntry[];
};

export async function saveEventFinancials(
  eventId: string,
  data: FinancialData,
): Promise<{ error?: string }> {
  const adminId = await requireAdminId();
  if (!adminId) return { error: "unauthorized" };
  await upsertSiteSetting(`report_financials_${eventId}`, JSON.stringify(data));
  revalidatePath("/admin/reports");
  return {};
}
