import nodemailer from "nodemailer";

// Без настоящего SMTP (AUTH_EMAIL_SERVER не задан или дефолтный плейсхолдер из .env.example)
// письмо просто печатается в консоль сервера — чтобы можно было тестировать регистрацию
// в дев-окружении без реального почтового ящика. В проде переменная обязана быть настоящей.
function isConfigured() {
  const server = process.env.AUTH_EMAIL_SERVER;
  return Boolean(server) && !server!.includes("smtp.example.com");
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const subject = "Подтвердите регистрацию — Peloton Ridder";
  const text = `Перейдите по ссылке, чтобы подтвердить регистрацию: ${verifyUrl}\n\nСсылка действует 24 часа.`;
  const html = `<p>Перейдите по ссылке, чтобы подтвердить регистрацию:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Ссылка действует 24 часа.</p>`;

  if (!isConfigured()) {
    console.log(`[mailer] AUTH_EMAIL_SERVER не настроен — письмо не отправлено.\n[mailer] Кому: ${to}\n[mailer] Ссылка подтверждения: ${verifyUrl}`);
    return;
  }

  const transport = nodemailer.createTransport(process.env.AUTH_EMAIL_SERVER);
  await transport.sendMail({
    to,
    from: process.env.AUTH_EMAIL_FROM,
    subject,
    text,
    html,
  });
}
