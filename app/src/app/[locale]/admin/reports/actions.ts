"use server";

import { revalidatePath } from "next/cache";
import { requireAdminId } from "@/lib/session";
import { upsertSiteSetting } from "@/lib/queries";

export type MedalEntry = { distanceId: string; count: number; unitCost: number };
export type LineEntry = { id: string; label: string; amount: number };
export type FinancialData = {
  medals: MedalEntry[];
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
