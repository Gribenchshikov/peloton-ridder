"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function RefreshUnreadBadge({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    router.refresh();
  }, [active, router]);

  return null;
}
