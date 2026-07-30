import { Link } from "@/i18n/navigation";
import { getSiteSetting } from "@/lib/queries";
import { ContactForm } from "./ContactForm";

export default async function ContactPage() {
  const [contactInfoRaw, bgUrl] = await Promise.all([
    getSiteSetting("contact_info"),
    getSiteSetting("bg_contact"),
  ]);
  let phone1 = "+7 700 000 0000";
  let phone2 = "+7 700 000 0001";
  let email = "info@ridder.run";
  try {
    if (contactInfoRaw) {
      const parsed = JSON.parse(contactInfoRaw);
      if (parsed.phone1) phone1 = parsed.phone1;
      if (parsed.phone2) phone2 = parsed.phone2;
      if (parsed.email) email = parsed.email;
    }
  } catch { /* use defaults */ }

  return (
    <main className="flex-1">
      {/* Hero banner */}
      {bgUrl ? (
        <div
          className="relative overflow-hidden px-6 py-16 sm:py-20"
          style={{ backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="absolute inset-0 bg-black/65" aria-hidden />
          <div className="relative mx-auto max-w-2xl text-white">
            <span className="text-xs font-bold uppercase tracking-wide text-ember">Контакты</span>
            <h1 className="mt-2 font-display text-2xl font-bold">Свяжитесь с нами</h1>
            <p className="mt-2 text-sm text-white/75">
              Если у вас есть вопросы об участии, партнёрстве или волонтёрстве — напишите нам.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-2xl px-6 py-10">
      {!bgUrl && (
        <div className="mb-8">
          <Link href="/" className="mb-2 block text-sm font-semibold text-ink-faint hover:text-ink">
            ← На главную
          </Link>
          <span className="text-xs font-bold uppercase tracking-wide text-ember">Контакты</span>
          <h1 className="mt-2 font-display text-2xl font-bold text-ink">Свяжитесь с нами</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Если у вас есть вопросы об участии, партнёрстве или волонтёрстве — напишите нам.
          </p>
        </div>
      )}
      {bgUrl && (
        <div className="mb-6">
          <Link href="/" className="text-sm font-semibold text-ink-faint hover:text-ink">
            ← На главную
          </Link>
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <a
          href={`tel:${phone1.replace(/\s/g, "")}`}
          className="flex flex-col gap-1 rounded-[var(--radius-m)] border border-border bg-surface p-4 transition-colors hover:bg-surface-2"
        >
          <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">Телефон</span>
          <span className="font-semibold text-ink">{phone1}</span>
        </a>
        <a
          href={`tel:${phone2.replace(/\s/g, "")}`}
          className="flex flex-col gap-1 rounded-[var(--radius-m)] border border-border bg-surface p-4 transition-colors hover:bg-surface-2"
        >
          <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">Телефон 2</span>
          <span className="font-semibold text-ink">{phone2}</span>
        </a>
        <a
          href={`mailto:${email}`}
          className="flex flex-col gap-1 rounded-[var(--radius-m)] border border-border bg-surface p-4 transition-colors hover:bg-surface-2"
        >
          <span className="text-xs font-bold uppercase tracking-wide text-ink-faint">Email</span>
          <span className="font-semibold text-ink">{email}</span>
        </a>
      </div>

      <div className="rounded-[var(--radius-m)] border border-border bg-surface p-6">
        <h2 className="mb-5 font-display text-lg font-bold text-ink">Написать сообщение</h2>
        <ContactForm />
      </div>
      </div>
    </main>
  );
}
