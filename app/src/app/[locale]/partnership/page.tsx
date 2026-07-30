import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { getSiteSetting } from "@/lib/queries";
import type { PartnershipContent } from "@/lib/settingsActions";
import { DEFAULT_SPONSOR_PACKAGES, DEFAULT_PARTNER_TYPES, type SponsorPackage, type PartnerType } from "@/lib/sponsorPackages";

const PARTNER_ICONS = {
  tech: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  prize: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
    </svg>
  ),
  media: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 10 4.553-2.07A1 1 0 0 1 21 8.845v6.31a1 1 0 0 1-1.447.894L15 14M5 18h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"/>
    </svg>
  ),
};

const DEFAULT_CONTENT: PartnershipContent = {
  heroTitle: "Поддержите горный спорт",
  heroEmphasis: "в Казахстане",
  heroSubtitle:
    "Peloton Ridder объединяет сотни бегунов в горах Восточного Казахстана. Наши старты — это живое сообщество, медиаприсутствие и прямой контакт с активной и платёжеспособной аудиторией.",
  stats: [
    { value: "400+", label: "участников в сезоне" },
    { value: "3", label: "старта в год" },
    { value: "7", label: "лет в Риддере" },
    { value: "18–65", label: "лет — средний возраст аудитории" },
  ],
  sponsorsIntro:
    "Выберите уровень присутствия вашего бренда на наших событиях. Для каждого пакета мы разрабатываем индивидуальное предложение — свяжитесь с нами, чтобы обсудить детали.",
  partnersIntro:
    "Партнёрство — это не спонсорство. Здесь мы ищем взаимовыгодный обмен ценностями: продуктом, экспертизой или аудиторией.",
};

export default async function PartnershipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const lang = (locale === "kk" || locale === "en") ? locale : "ru";

  const [partners, contentRaw, packagesRaw, typesRaw, bgUrl] = await Promise.all([
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
    getSiteSetting("partnership_content"),
    getSiteSetting("sponsor_packages"),
    getSiteSetting("partner_types"),
    getSiteSetting("bg_partnership"),
  ]);

  let content: PartnershipContent = DEFAULT_CONTENT;
  try { if (contentRaw) content = { ...DEFAULT_CONTENT, ...JSON.parse(contentRaw) }; } catch { /* use default */ }

  let sponsorPackages: SponsorPackage[] = DEFAULT_SPONSOR_PACKAGES;
  try { if (packagesRaw) sponsorPackages = JSON.parse(packagesRaw); } catch { /* use default */ }

  let partnerTypes: PartnerType[] = DEFAULT_PARTNER_TYPES;
  try { if (typesRaw) partnerTypes = JSON.parse(typesRaw); } catch { /* use default */ }

  const bgStyle = bgUrl ? { backgroundImage: `url(${bgUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined;

  return (
    <main className="flex-1">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-ink px-6 py-20 text-white sm:py-28" style={bgStyle}>
        {bgUrl && <div className="absolute inset-0 bg-black/70" aria-hidden />}
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 70% 40%, var(--color-ember) 0%, transparent 70%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-4xl">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-ember">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-ember" aria-hidden />
            Партнёрство и спонсорство
          </span>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            {content.heroTitle}<br className="hidden sm:block" />
            <span className="text-ember"> {content.heroEmphasis}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
            {content.heroSubtitle}
          </p>
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-m)] border border-white/10 bg-white/10 sm:grid-cols-4">
            {content.stats.map((s) => (
              <div key={s.value} className="bg-white/5 px-5 py-4 backdrop-blur-sm">
                <div className="font-display text-2xl font-extrabold text-white sm:text-3xl">{s.value}</div>
                <div className="mt-0.5 text-xs text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Контакт (верхний) ── */}
      <section className="border-b border-border bg-surface-2 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-display text-base font-bold text-ink sm:text-lg">Готовы обсудить сотрудничество?</p>
            <p className="mt-1 text-sm text-ink-soft">Расскажите о вашей компании и целях — мы подберём формат, который принесёт реальный результат для обеих сторон.</p>
          </div>
          <Link
            href="/contact"
            className="shrink-0 inline-flex items-center gap-2 rounded-[var(--radius-s)] bg-ember px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
          >
            Написать нам
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Спонсорство ── */}
      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-ember">Спонсорство</span>
          <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">Спонсорские пакеты</h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{content.sponsorsIntro}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {sponsorPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative flex flex-col rounded-[var(--radius-m)] border p-6 ${
                pkg.featured
                  ? "border-ember bg-ember/5"
                  : "border-border bg-surface"
              }`}
            >
              {pkg.featured && (
                <span className="absolute right-4 top-4 rounded-full bg-ember px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-white">
                  Топ
                </span>
              )}
              <div className="mb-4">
                <span
                  className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    pkg.featured
                      ? "bg-ember text-white"
                      : "bg-surface-2 text-ink-soft"
                  }`}
                >
                  {pkg.tier[lang]}
                </span>
                <p className="mt-2 text-xs text-ink-faint">{pkg.label[lang]}</p>
              </div>

              <ul className="flex flex-col gap-2 text-sm text-ink-soft">
                {pkg.benefits[lang].map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`mt-0.5 shrink-0 ${pkg.featured ? "text-ember" : "text-ink-faint"}`}
                      aria-hidden
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <Link
                  href="/contact"
                  className={`block w-full rounded-[var(--radius-s)] py-2.5 text-center text-sm font-bold transition-colors ${
                    pkg.featured
                      ? "bg-ember text-white hover:bg-ember-strong"
                      : "border border-border bg-surface-2 text-ink hover:border-ink-soft hover:bg-surface"
                  }`}
                >
                  Обсудить
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Партнёрство ── */}
      <section className="border-t border-border bg-surface-2 px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-ember">Партнёрство</span>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">Форматы партнёрства</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{content.partnersIntro}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {partnerTypes.map((pt) => (
              <div key={pt.id} className="rounded-[var(--radius-m)] border border-border bg-surface p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[var(--radius-s)] bg-ember/10 text-ember">
                  {PARTNER_ICONS[pt.id as keyof typeof PARTNER_ICONS]}
                </div>
                <h3 className="font-display text-base font-bold text-ink">{pt.name[lang]}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{pt.description[lang]}</p>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-wide text-ink-faint">Вы даёте</p>
                    <ul className="flex flex-col gap-1.5">
                      {pt.youGive[lang].map((g) => (
                        <li key={g} className="flex items-start gap-1.5 text-xs text-ink-soft">
                          <span className="mt-0.5 shrink-0 text-ink-faint">—</span>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-wide text-ink-faint">Вы получаете</p>
                    <ul className="flex flex-col gap-1.5">
                      {pt.youGet[lang].map((g) => (
                        <li key={g} className="flex items-start gap-1.5 text-xs text-ink-soft">
                          <span className="mt-0.5 shrink-0 text-ember">✓</span>
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-xl">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            Готовы обсудить сотрудничество?
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Расскажите о вашей компании и целях — мы подберём формат, который принесёт реальный результат
            для обеих сторон.
          </p>
          <Link
            href="/contact"
            className="mt-8 inline-flex items-center gap-2 rounded-[var(--radius-s)] bg-ember px-8 py-3.5 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
          >
            Написать нам
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* ── Наши партнёры ── */}
      {partners.length > 0 && (
        <section className="border-t border-border bg-surface-2 px-6 py-14">
          <div className="mx-auto max-w-5xl">
            <p className="mb-8 text-center text-xs font-bold uppercase tracking-widest text-ink-faint">
              Нам доверяют
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {partners.map((p) => {
                const inner = (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.logoUrl}
                    alt={p.name}
                    className="h-10 max-w-[120px] object-contain opacity-60 transition-opacity hover:opacity-100"
                  />
                );
                return p.websiteUrl ? (
                  <a key={p.id} href={p.websiteUrl} target="_blank" rel="noopener noreferrer" title={p.name}>
                    {inner}
                  </a>
                ) : (
                  <div key={p.id} title={p.name}>{inner}</div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
