import type { ReactNode } from "react";

export function AuthSuccessCard({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-l)] border border-border bg-surface p-6 text-center">
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-ink-soft">{text}</p>
      {children}
    </div>
  );
}
