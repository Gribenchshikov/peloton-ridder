import nodemailer from "nodemailer";

// Без настоящего SMTP (AUTH_EMAIL_SERVER не задан или дефолтный плейсхолдер из .env.example)
// письмо просто печатается в консоль сервера — чтобы можно было тестировать регистрацию
// в дев-окружении без реального почтового ящика. В проде переменная обязана быть настоящей.
function isConfigured() {
  const server = process.env.AUTH_EMAIL_SERVER;
  return Boolean(server) && !server!.includes("smtp.example.com");
}

// Ошибку SMTP (обрыв соединения, таймаут, неверные креды) ловим здесь и не пробрасываем
// дальше: часть вызывающих флоу (например, forgotPasswordAction) намеренно возвращают
// одинаковый ответ независимо от того, найден ли аккаунт — необработанное исключение
// именно на «письмо отправляется только если аккаунт существует» стало бы отдельным
// способом отличить один случай от другого. Сбой всё равно виден в логах сервера.
async function sendMail(to: string, subject: string, text: string, html: string) {
  if (!isConfigured()) {
    console.log(`[mailer] AUTH_EMAIL_SERVER не настроен — письмо не отправлено.\n[mailer] Кому: ${to}\n[mailer] Тема: ${subject}\n[mailer] Текст: ${text}`);
    return;
  }

  try {
    const transport = nodemailer.createTransport(process.env.AUTH_EMAIL_SERVER);
    await transport.sendMail({ to, from: process.env.AUTH_EMAIL_FROM, subject, text, html });
  } catch (error) {
    console.error(`[mailer] Не удалось отправить письмо (тема: ${subject}):`, error);
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const text = `Перейдите по ссылке, чтобы подтвердить регистрацию: ${verifyUrl}\n\nСсылка действует 24 часа.`;
  const html = `<p>Перейдите по ссылке, чтобы подтвердить регистрацию:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Ссылка действует 24 часа.</p>`;
  await sendMail(to, "Подтвердите регистрацию — Peloton Ridder", text, html);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const text = `Перейдите по ссылке, чтобы задать новый пароль: ${resetUrl}\n\nСсылка действует 24 часа. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.`;
  const html = `<p>Перейдите по ссылке, чтобы задать новый пароль:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ссылка действует 24 часа. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>`;
  await sendMail(to, "Сброс пароля — Peloton Ridder", text, html);
}
