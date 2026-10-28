"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "open-refund-badge-sync";

/** Шапка живёт в корневом layout и после обработки заявок может остаться со старым
 *  числом. Один refresh, когда список уже пуст, забирает layout заново. */
export function RefreshOpenRefunds({ empty }: { empty: boolean }) {
  const router = useRouter();

  useEffect(() => {
    try {
      if (!empty) {
        sessionStorage.removeItem(STORAGE_KEY);
        return;
      }
      if (sessionStorage.getItem(STORAGE_KEY) === "1") return;
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      return;
    }
    router.refresh();
  }, [empty, router]);

  return null;
}
