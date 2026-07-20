import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { consumeVerificationToken } from "@/lib/verification-token";

export default async function VerifyEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let ok = false;

  if (token) {
    const payload = await consumeVerificationToken(token, "EMAIL_CHANGE");
    if (payload) {
      const [userId, newEmail] = payload.split(":");
      if (userId && newEmail) {
        const taken = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } });
        if (!taken) {
          await prisma.user.update({
            where: { id: userId },
            data: { email: newEmail, emailVerified: new Date() },
          });
          ok = true;
        }
      }
    }
  }

  return <Result ok={ok} />;
}

function Result({ ok }: { ok: boolean }) {
  const t = useTranslations("Account");
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-2xl font-bold text-ink">
          {ok ? t("changeEmailVerifyOkTitle") : t("changeEmailVerifyFailTitle")}
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {ok ? t("changeEmailVerifyOkText") : t("changeEmailVerifyFailText")}
        </p>
        <Link
          href="/account"
          className="mt-6 inline-block rounded-[var(--radius-s)] bg-ember px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-ember-strong"
        >
          {t("changeEmailVerifyAccountCta")}
        </Link>
      </div>
    </main>
  );
}
