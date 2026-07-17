import type { useFormatter } from "next-intl";

export function formatKzt(format: ReturnType<typeof useFormatter>, amount: number) {
  return format.number(amount, { style: "currency", currency: "KZT", maximumFractionDigits: 0 });
}
