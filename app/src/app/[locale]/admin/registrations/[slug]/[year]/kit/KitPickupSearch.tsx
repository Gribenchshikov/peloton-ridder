"use client";

import { useState, useMemo } from "react";

type Reg = {
  id: string;
  bibNumber: number | null;
  user: { firstName: string; lastName: string; phone: string | null; email: string };
  distance: { id: string; name: string } | null;
};

export function KitPickupSearch({ regs }: { regs: Reg[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return regs;
    return regs.filter((r) => {
      const bib = r.bibNumber?.toString() ?? "";
      return (
        r.user.firstName.toLowerCase().includes(q) ||
        r.user.lastName.toLowerCase().includes(q) ||
        r.user.email.toLowerCase().includes(q) ||
        bib.includes(q)
      );
    });
  }, [regs, query]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск по имени, фамилии, email, номеру нагрудника..."
        className="w-full rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ember"
      />
      {query && (
        <p className="text-xs text-ink-faint">
          Найдено: <span className="font-semibold text-ink">{filtered.length}</span> из {regs.length}
        </p>
      )}
      <div className="overflow-x-auto rounded-[var(--radius-m)] border border-border">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-2.5 text-left">№ нагр.</th>
              <th className="px-4 py-2.5 text-left">Участник</th>
              <th className="px-4 py-2.5 text-left">Телефон</th>
              <th className="px-4 py-2.5 text-left">Дистанция</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-ink-faint">
                  Ничего не найдено
                </td>
              </tr>
            ) : (
              filtered.map((reg) => (
                <tr key={reg.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-2.5 tabular-nums font-bold text-ink">
                    {reg.bibNumber ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-ink">{reg.user.firstName} {reg.user.lastName}</div>
                    <div className="text-xs text-ink-faint">{reg.user.email}</div>
                  </td>
                  <td className="px-4 py-2.5 text-ink-soft">{reg.user.phone ?? "—"}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{reg.distance?.name ?? "Трансфер"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
