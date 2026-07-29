import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { IconSprite } from "@/components/IconSprite";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getSiteSetting } from "@/lib/queries";
import "../globals.css";

const FONT_CSS: Record<string, string> = {
  unbounded:  "'Unbounded', 'Arial Black', sans-serif",
  oswald:     "'Oswald', 'Arial Narrow', sans-serif",
  "bebas-neue": "'Bebas Neue', Impact, sans-serif",
  impact:     "Impact, 'Arial Narrow', sans-serif",
  georgia:    "Georgia, 'Times New Roman', serif",
};

export const metadata: Metadata = {
  title: "Peloton Ridder",
  description: "Беговой клуб · Риддер",
};

// Публичные страницы читают БД напрямую (события, серия, забеги) — рендерим
// на каждый запрос, а не печём статику при сборке. Трафик у клуба небольшой,
// цена SELECT в Postgres ничтожна, а взамен админ не ждёт редеплой, чтобы
// увидеть свои же правки на сайте.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const [displayFont, customFontUrl, customFontCss] = await Promise.all([
    getSiteSetting("display_font"),
    getSiteSetting("custom_font_url"),
    getSiteSetting("custom_font_css"),
  ]);

  let fontStyle: string | null = null;
  if (displayFont === "custom" && customFontUrl && customFontCss) {
    const safeName = customFontCss.match(/'([^']+)'/)?.[1] ?? "CustomFont";
    const safeUrl = customFontUrl.replace(/^http:\/\//, "https://");
    fontStyle = `@font-face{font-family:'${safeName}';src:url('${safeUrl}')format('woff2');font-display:swap;}:root{--font-display:${customFontCss};}`;
  } else if (displayFont && FONT_CSS[displayFont]) {
    fontStyle = `:root{--font-display:${FONT_CSS[displayFont]};}`;
  }

  return (
    <html lang={locale} className="h-full antialiased">
      {fontStyle && (
        <head>
          <style>{fontStyle}</style>
        </head>
      )}
      <body className="min-h-full flex flex-col">
        <IconSprite />
        <NextIntlClientProvider>
          <SiteHeader locale={locale} />
          <div className="flex flex-1 flex-col">
            {children}
          </div>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
