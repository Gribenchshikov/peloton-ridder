import { phoneHref, whatsappHref, type PhoneChannel, type VisiblePhone } from "@/lib/contactInfo";

function ChannelBadges({ channels }: { channels: PhoneChannel[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {channels.includes("calls") && (
        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
          Звонки
        </span>
      )}
      {channels.includes("whatsapp") && (
        <span className="rounded-full bg-spruce/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-spruce">
          WhatsApp
        </span>
      )}
    </span>
  );
}

export function FooterPhoneLinks({ phones }: { phones: VisiblePhone[] }) {
  if (phones.length === 0) return null;
  return (
    <>
      {phones.map((phone) => (
        <span key={phone.key} className="flex flex-col gap-0.5">
          <a
            href={phoneHref(phone.number, phone.channels)}
            className="text-sm text-ink-soft transition-colors hover:text-ink"
          >
            {phone.number}
          </a>
          <span className="flex items-center gap-2">
            <ChannelBadges channels={phone.channels} />
            {phone.channels.includes("whatsapp") && phone.channels.includes("calls") && (
              <a
                href={whatsappHref(phone.number)}
                className="text-[11px] font-semibold text-spruce hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Написать
              </a>
            )}
          </span>
        </span>
      ))}
    </>
  );
}

export function ContactPhoneCards({ phones }: { phones: VisiblePhone[] }) {
  if (phones.length === 0) return null;
  return (
    <>
      {phones.map((phone) => (
        <div
          key={phone.key}
          className="flex flex-col gap-1 rounded-[var(--radius-m)] border border-border bg-surface p-4"
        >
          <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">Телефон</span>
          <a
            href={phoneHref(phone.number, phone.channels)}
            className="font-semibold text-ink transition-colors hover:text-ember"
          >
            {phone.number}
          </a>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <ChannelBadges channels={phone.channels} />
            {phone.channels.includes("whatsapp") && (
              <a
                href={whatsappHref(phone.number)}
                className="text-xs font-semibold text-spruce hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
