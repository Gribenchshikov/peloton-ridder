import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { IconSprite } from "@/components/IconSprite";
import "../globals.css";

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

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <IconSprite />
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
