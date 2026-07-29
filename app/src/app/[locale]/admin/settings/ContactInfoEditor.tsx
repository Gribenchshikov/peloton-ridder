"use client";

import { useState, useTransition } from "react";
import { saveContactInfoAction, type ContactInfo } from "@/lib/settingsActions";

export function ContactInfoEditor({ initial }: { initial: ContactInfo }) {
  const [info, setInfo] = useState<ContactInfo>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function update(field: keyof ContactInfo, val: string) {
    setInfo((prev) => ({ ...prev, [field]: val }));
    setStatus("idle");
  }

  function handleSave() {
    setStatus("saving");
    startTransition(async () => {
      const result = await saveContactInfoAction(info);
      setStatus("error" in result ? "error" : "saved");
    });
  }

  return (
    <section className="rounded-[var(--radius-m)] border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 font-display text-lg font-bold text-ink">Контакты</h2>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink-soft">Телефон 1</span>
          <input
            type="tel"
            value={info.phone1}
            onChange={(e) => update("phone1", e.target.value)}
            placeholder="+7 700 000 0000"
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink focus:border-ember focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink-soft">Телефон 2</span>
          <input
            type="tel"
            value={info.phone2}
            onChange={(e) => update("phone2", e.target.value)}
            placeholder="+7 700 000 0001"
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink focus:border-ember focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-semibold text-ink-soft">Email</span>
          <input
            type="email"
            value={info.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="info@ridder.run"
            className="rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-ink focus:border-ember focus:outline-none"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-[var(--radius-s)] bg-ember px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 hover:bg-ember-strong"
        >
          {status === "saving" ? "Сохраняем…" : "Сохранить"}
        </button>
        {status === "saved" && <span className="text-sm text-spruce">Сохранено ✓</span>}
        {status === "error" && <span className="text-sm text-danger">Ошибка при сохранении</span>}
      </div>
    </section>
  );
}
