"use client";

import { useState, useTransition } from "react";
import { saveContactInfoAction } from "@/lib/settingsActions";
import type { ContactInfo, PhoneChannel } from "@/lib/contactInfo";

export function ContactInfoEditor({ initial }: { initial: ContactInfo }) {
  const [info, setInfo] = useState<ContactInfo>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof ContactInfo>(field: K, val: ContactInfo[K]) {
    setInfo((prev) => ({ ...prev, [field]: val }));
    setStatus("idle");
  }

  function toggleChannel(field: "phone1Channels" | "phone2Channels", channel: PhoneChannel) {
    setInfo((prev) => {
      const current = prev[field];
      const next = current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel];
      return { ...prev, [field]: next.length > 0 ? next : [channel] };
    });
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
      <div className="flex flex-col gap-5">
        <PhoneEditor
          label="Телефон 1"
          number={info.phone1}
          enabled={info.phone1Enabled}
          channels={info.phone1Channels}
          placeholder="+7 700 000 0000"
          onNumber={(value) => update("phone1", value)}
          onEnabled={(value) => update("phone1Enabled", value)}
          onChannel={(channel) => toggleChannel("phone1Channels", channel)}
        />
        <PhoneEditor
          label="Телефон 2"
          number={info.phone2}
          enabled={info.phone2Enabled}
          channels={info.phone2Channels}
          placeholder="+7 700 000 0001"
          onNumber={(value) => update("phone2", value)}
          onEnabled={(value) => update("phone2Enabled", value)}
          onChannel={(channel) => toggleChannel("phone2Channels", channel)}
        />
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

function PhoneEditor({
  label,
  number,
  enabled,
  channels,
  placeholder,
  onNumber,
  onEnabled,
  onChannel,
}: {
  label: string;
  number: string;
  enabled: boolean;
  channels: PhoneChannel[];
  placeholder: string;
  onNumber: (value: string) => void;
  onEnabled: (value: boolean) => void;
  onChannel: (channel: PhoneChannel) => void;
}) {
  return (
    <div className="rounded-[var(--radius-s)] border border-border bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink-soft">{label}</span>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
          <span className={enabled ? "text-spruce" : "text-ink-faint"}>{enabled ? "На сайте" : "Скрыт"}</span>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => onEnabled(!enabled)}
            className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${
              enabled ? "bg-ember" : "bg-ink-soft/40"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                enabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      </div>
      <input
        type="tel"
        value={number}
        onChange={(e) => onNumber(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[var(--radius-s)] border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-ember focus:outline-none"
      />
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-soft">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={channels.includes("calls")}
            onChange={() => onChannel("calls")}
            className="accent-ember"
          />
          Звонки
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={channels.includes("whatsapp")}
            onChange={() => onChannel("whatsapp")}
            className="accent-ember"
          />
          WhatsApp
        </label>
      </div>
    </div>
  );
}
