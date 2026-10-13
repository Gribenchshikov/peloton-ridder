import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { logoutAction } from "@/lib/authActions";
import { AvatarUpload } from "./AvatarUpload";

export function AccountHeader({
  name,
  isAdmin,
  avatarUrl,
}: {
  name: string;
  isAdmin: boolean;
  avatarUrl: string | null;
}) {
  const t = useTranslations("Account");
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-5">
        <AvatarUpload initialUrl={avatarUrl} name={name} />
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-ember">{t("eyebrow")}</span>
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight text-ink">{name}</h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-1">
        {isAdmin && (
          <Link
            href="/admin"
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("adminCta")}
          </Link>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-[var(--radius-s)] border border-border px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            {t("logoutCta")}
          </button>
        </form>
      </div>
    </div>
  );
}
