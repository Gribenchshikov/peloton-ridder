#!/usr/bin/env npx tsx
/**
 * Smoke-test: быстрая проверка критических маршрутов после деплоя.
 * Запуск: npx tsx scripts/smoke-test.ts [http://localhost:3000]
 *
 * Exit 0 = всё OK, exit 1 = есть падения.
 */

const BASE = process.argv[2]?.replace(/\/$/, "") ?? "http://localhost:3000";
const LOCALE = "ru";

type Check = {
  name: string;
  url: string;
  method?: string;
  /** Ожидаемый статус. По умолчанию: 200. */
  expect?: number;
  /** Строка, которая должна встречаться в теле ответа. */
  contains?: string;
  /** Строка, которой НЕ должно быть в теле ответа. */
  notContains?: string;
};

const checks: Check[] = [
  // Публичные страницы
  { name: "Главная", url: `/${LOCALE}` },
  { name: "События", url: `/${LOCALE}/events` },
  { name: "О клубе", url: `/${LOCALE}/about` },
  { name: "Вход", url: `/${LOCALE}/login` },
  { name: "Регистрация", url: `/${LOCALE}/register` },
  { name: "Забыл пароль", url: `/${LOCALE}/forgot-password` },
  { name: "Политика конфиденциальности", url: `/${LOCALE}/legal/privacy` },

  // Защищённые — должны редиректить на /login, не давать 500
  {
    name: "Кабинет (редирект)",
    url: `/${LOCALE}/account`,
    expect: 307,
  },
  {
    name: "Админка (редирект)",
    url: `/${LOCALE}/admin`,
    expect: 307,
  },

  // API health
  { name: "API /api/auth/session", url: "/api/auth/session", expect: 200 },

  // Нет 500 на странице волонтёра
  {
    name: "Волонтёр заявка (редирект или форма)",
    url: `/${LOCALE}/volunteer/apply`,
    expect: 307,
  },
];

type Result = {
  name: string;
  url: string;
  ok: boolean;
  status: number;
  issue?: string;
};

async function runCheck(check: Check): Promise<Result> {
  const fullUrl = `${BASE}${check.url}`;
  const expectedStatus = check.expect ?? 200;
  try {
    const res = await fetch(fullUrl, {
      method: check.method ?? "GET",
      redirect: "manual",
      headers: { "User-Agent": "smoke-test/1.0" },
    });

    const status = res.status;

    if (status !== expectedStatus) {
      return {
        name: check.name,
        url: fullUrl,
        ok: false,
        status,
        issue: `Ожидался ${expectedStatus}, получен ${status}`,
      };
    }

    if (check.contains || check.notContains) {
      const body = await res.text();
      if (check.contains && !body.includes(check.contains)) {
        return {
          name: check.name,
          url: fullUrl,
          ok: false,
          status,
          issue: `В теле не найдено: "${check.contains}"`,
        };
      }
      if (check.notContains && body.includes(check.notContains)) {
        return {
          name: check.name,
          url: fullUrl,
          ok: false,
          status,
          issue: `В теле найдено нежелательное: "${check.notContains}"`,
        };
      }
    }

    return { name: check.name, url: fullUrl, ok: true, status };
  } catch (err) {
    return {
      name: check.name,
      url: fullUrl,
      ok: false,
      status: 0,
      issue: String(err),
    };
  }
}

async function main() {
  console.log(`\nSmoke-test → ${BASE}\n${"─".repeat(60)}`);

  const results = await Promise.all(checks.map(runCheck));

  let pass = 0;
  let fail = 0;

  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    const line = `${icon}  [${r.status}]  ${r.name}`;
    if (r.ok) {
      console.log(`\x1b[32m${line}\x1b[0m`);
      pass++;
    } else {
      console.log(`\x1b[31m${line}\x1b[0m`);
      console.log(`       ↳ ${r.issue}`);
      console.log(`       ↳ ${r.url}`);
      fail++;
    }
  }

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Итого: ${pass} OK, ${fail} FAILED\n`);

  if (fail > 0) process.exit(1);
}

main();
