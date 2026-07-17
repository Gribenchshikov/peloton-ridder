export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-stone-50 px-6 py-24 text-center">
      <span
        className="text-xs font-bold uppercase tracking-wide text-ember"
        style={{ fontFamily: "var(--font-body)" }}
      >
        Peloton Ridder · проверка шрифтов и палитры
      </span>
      <h1
        className="max-w-2xl text-4xl font-extrabold text-ink sm:text-5xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Беги там, где начинаются горы. Ридден Race Series — Әлия, Қаныш, Өмір
      </h1>
      <p
        className="max-w-xl text-base text-ink-soft"
        style={{ fontFamily: "var(--font-body)" }}
      >
        中文测试文字 · Kazakh: Ә Ғ Қ Ң Ө Ұ Һ · русский текст для проверки кириллицы.
      </p>
      <div className="flex gap-3">
        <span className="rounded-[var(--radius-s)] bg-ember px-4 py-2 text-sm font-semibold text-white">ember</span>
        <span className="rounded-[var(--radius-s)] bg-spruce px-4 py-2 text-sm font-semibold text-white">spruce</span>
        <span className="rounded-[var(--radius-s)] bg-dawn px-4 py-2 text-sm font-semibold text-ink">dawn</span>
        <span className="rounded-[var(--radius-s)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink">surface</span>
      </div>
    </main>
  );
}
