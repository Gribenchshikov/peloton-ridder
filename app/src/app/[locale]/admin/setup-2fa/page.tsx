import { requireAdminPage } from "@/lib/session";
import { generateTotpSetupAction } from "./actions";
import { ConfirmForm } from "./ConfirmForm";

export default async function Setup2faPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale, "/admin/setup-2fa");

  const { qrDataUrl, manualKey } = await generateTotpSetupAction();

  return (
    <main className="flex min-h-screen items-start justify-center bg-bg px-4 pt-20">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-ink">Настройка двухфакторной аутентификации</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Для доступа в панель администратора необходимо настроить 2FA. Это одноразовая процедура.
          </p>
        </div>

        <div className="flex flex-col gap-6 rounded-[var(--radius-m)] border border-border bg-surface p-6">
          <Step n={1} title="Установите приложение-аутентификатор">
            <p className="text-sm text-ink-soft">
              Google Authenticator, Authy, или любое TOTP-совместимое приложение.
            </p>
          </Step>

          <Step n={2} title="Отсканируйте QR-код">
            <div className="flex flex-col items-start gap-4">
              <div className="rounded-[var(--radius-s)] border border-border bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR-код для 2FA" width={180} height={180} />
              </div>
              <details className="w-full">
                <summary className="cursor-pointer text-xs text-ink-faint hover:text-ink">
                  Ввести ключ вручную
                </summary>
                <code className="mt-2 block break-all rounded-[var(--radius-s)] bg-surface-2 px-3 py-2 font-mono text-xs text-ink">
                  {manualKey}
                </code>
              </details>
            </div>
          </Step>

          <Step n={3} title="Введите код из приложения">
            <p className="mb-3 text-sm text-ink-soft">
              Введите 6-значный код, чтобы подтвердить, что всё настроено верно.
            </p>
            <ConfirmForm />
          </Step>
        </div>
      </div>
    </main>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ember text-xs font-bold text-white">
        {n}
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {children}
      </div>
    </div>
  );
}
