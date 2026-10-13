import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

function pageHref(page: number) {
  return page <= 1
    ? "/account/messages"
    : { pathname: "/account/messages" as const, query: { page: String(page) } };
}

export function MessagesPagination({
  page,
  pageCount,
  total,
}: {
  page: number;
  pageCount: number;
  total: number;
}) {
  const t = useTranslations("Account");
  if (total === 0 || pageCount <= 1) return null;

  const prev = page > 1 ? pageHref(page - 1) : null;
  const next = page < pageCount ? pageHref(page + 1) : null;

  return (
    <nav className="flex items-center justify-between gap-3 pt-2" aria-label={t("messagesTitle")}>
      {prev ? (
        <Link
          href={prev}
          className="rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          {t("messagesPrev")}
        </Link>
      ) : (
        <span className="rounded-[var(--radius-s)] border border-transparent px-3 py-1.5 text-sm font-semibold text-ink-faint">
          {t("messagesPrev")}
        </span>
      )}
      <span className="text-sm text-ink-soft">{t("messagesPage", { page, pages: pageCount })}</span>
      {next ? (
        <Link
          href={next}
          className="rounded-[var(--radius-s)] border border-border px-3 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          {t("messagesNext")}
        </Link>
      ) : (
        <span className="rounded-[var(--radius-s)] border border-transparent px-3 py-1.5 text-sm font-semibold text-ink-faint">
          {t("messagesNext")}
        </span>
      )}
    </nav>
  );
}
