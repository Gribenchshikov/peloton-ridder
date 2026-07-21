import { Link } from "@/i18n/navigation";

export default function FrozenPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="text-5xl">❄️</div>
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Аккаунт заморожен</h1>
        <p className="mt-3 text-ink-soft">
          Ваш аккаунт заморожен администратором. Вход на сайт недоступен.
        </p>
        <p className="mt-2 text-ink-soft">
          Если вы считаете, что это ошибка, свяжитесь с нами:
        </p>
        <a
          href="mailto:support@ridder.kz"
          className="mt-2 block font-semibold text-ember hover:underline"
        >
          support@ridder.kz
        </a>
      </div>
      <Link
        href="/login"
        className="mt-2 text-sm text-ink-faint hover:text-ink hover:underline"
      >
        ← Вернуться на страницу входа
      </Link>
    </main>
  );
}
