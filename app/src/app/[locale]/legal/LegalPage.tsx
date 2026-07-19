import { Link } from "@/i18n/navigation";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link
        href="/"
        className="text-sm font-semibold text-ink-faint transition-colors hover:text-ink"
      >
        ← Главная
      </Link>

      <h1 className="mt-6 font-display text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-1 text-xs text-ink-faint">{updatedAt}</p>

      <div className="prose prose-sm mt-8 max-w-none text-ink-soft [&_h2]:font-display [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink [&_p]:leading-relaxed">
        {children}
      </div>
    </main>
  );
}
