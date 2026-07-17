import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/verification-token";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const email = token ? await consumeVerificationToken(token, "EMAIL_VERIFY") : null;

  if (email) {
    await prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });
  }

  return <VerifyResult ok={Boolean(email)} />;
}

function VerifyResult({ ok }: { ok: boolean }) {
  const t = useTranslations("Auth");
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-2xl font-bold text-ink">{ok ? t("verifySuccessTitle") : t("verifyFailTitle")}</h1>
        <p className="mt-2 text-sm text-ink-soft">{ok ? t("verifySuccessText") : t("verifyFailText")}</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
        >
          {t("loginCta")}
        </Link>
      </div>
    </main>
  );
}
