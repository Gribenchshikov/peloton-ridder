import nodemailer from "nodemailer";
import QRCode from "qrcode";

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

export async function sendRegistrationConfirmationEmail(
  to: string,
  name: string,
  raceName: string,
  distanceName: string,
  bibNumber: number,
  dateISO: Date,
  location: string,
  registrationId: string,
) {
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const ticketUrl = `${appUrl}/ru/tickets/${registrationId}`;

  const dateStr = new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateISO);

  const subject = `Вы зарегистрированы — ${raceName} · №${bibNumber}`;

  const qrDataUrl = await QRCode.toDataURL(`RIDDER:${registrationId}`, { width: 160, margin: 1 });

  const text = [
    `Здравствуйте, ${name}!`,
    ``,
    `Ваш платёж подтверждён. Вы зарегистрированы на забег.`,
    ``,
    `Забег: ${raceName}`,
    `Дистанция: ${distanceName}`,
    `Стартовый номер: №${bibNumber}`,
    `Дата: ${dateStr}`,
    `Место: ${location}`,
    ``,
    `Цифровой билет: ${ticketUrl}`,
    ``,
    `С уважением,`,
    `Peloton Ridder`,
  ].join("\n");

  const html = `
<p>Здравствуйте, ${name}!</p>
<p>Ваш платёж подтверждён. Вы зарегистрированы на забег.</p>
<table style="border-collapse:collapse;margin:16px 0">
  <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px">Забег</td><td style="font-weight:600">${raceName}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px">Дистанция</td><td>${distanceName}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px">Стартовый номер</td><td style="font-size:20px;font-weight:700;color:#EA580C">№${bibNumber}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px">Дата</td><td>${dateStr}</td></tr>
  <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px">Место</td><td>${location}</td></tr>
</table>
<p style="margin:20px 0 8px;font-weight:600">QR-код для регистрации на старте:</p>
<img src="${qrDataUrl}" alt="QR-код" style="width:160px;height:160px;display:block" />
<p style="margin:16px 0">
  <a href="${ticketUrl}" style="display:inline-block;padding:10px 20px;background:#EA580C;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">
    Открыть цифровой билет
  </a>
</p>
<p style="color:#888;font-size:13px">С уважением,<br>Peloton Ridder</p>
`.trim();

  await sendMail(to, subject, text, html);
}
