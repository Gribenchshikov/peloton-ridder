import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { parseContactInfo } from "@/lib/contactInfo";
import { getSiteSetting } from "@/lib/queries";

function isRealSmtpValue(value: string | undefined) {
  return Boolean(value) && !value!.includes("smtp.example.com");
}

function authServerConfigured() {
  return isRealSmtpValue(process.env.AUTH_EMAIL_SERVER);
}

function smtpHostConfigured() {
  return isRealSmtpValue(process.env.SMTP_HOST);
}

// AUTH_EMAIL_SERVER — URL для NextAuth; SMTP_HOST — тот же SMTP, которым шлются
// промокоды волонтёрам. На тесте часто заполнен только второй блок.
function isConfigured() {
  return authServerConfigured() || smtpHostConfigured();
}

const SMTP_TIMEOUT_MS = 12_000;

function smtpTimeouts() {
  return {
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  };
}

function createTransport() {
  // SMTP_HOST — тот же транспорт, которым уже уходят промокоды волонтёрам.
  // AUTH_EMAIL_SERVER часто остаётся плейсхолдером из примера NextAuth.
  if (smtpHostConfigured()) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
      ...smtpTimeouts(),
    });
  }
  return nodemailer.createTransport({
    url: process.env.AUTH_EMAIL_SERVER,
    ...smtpTimeouts(),
  });
}

// Ошибку SMTP (обрыв соединения, таймаут, неверные креды) ловим здесь и не пробрасываем
// дальше: часть вызывающих флоу (например, forgotPasswordAction) намеренно возвращают
// одинаковый ответ независимо от того, найден ли аккаунт — необработанное исключение
// именно на «письмо отправляется только если аккаунт существует» стало бы отдельным
// способом отличить один случай от другого. Сбой всё равно виден в логах сервера.
function mailFrom() {
  return (
    process.env.SMTP_FROM
    || process.env.AUTH_EMAIL_FROM
    || "Peloton Ridder <noreply@peloton-ridder.kz>"
  );
}

function addEmail(list: string[], value: string | null | undefined) {
  const email = value?.trim();
  if (email && email.includes("@") && !list.includes(email)) list.push(email);
}

export async function resolveOrganizerInboxEmails() {
  const emails: string[] = [];
  const info = parseContactInfo(await getSiteSetting("contact_info"));
  addEmail(emails, info.email);
  addEmail(emails, process.env.ORGANIZER_EMAIL);
  return emails;
}

async function sendMail(
  to: string,
  subject: string,
  text: string,
  html: string,
  options?: { replyTo?: string },
): Promise<boolean> {
  if (!isConfigured()) {
    console.error(
      `[mailer] SMTP не настроен (SMTP_HOST=${process.env.SMTP_HOST || "—"}, AUTH_EMAIL_SERVER=${authServerConfigured() ? "задан" : "нет"}). Письмо не отправлено.\n[mailer] Кому: ${to}\n[mailer] Тема: ${subject}`,
    );
    return false;
  }

  let transport: ReturnType<typeof createTransport> | undefined;
  try {
    transport = createTransport();
    await transport.sendMail({
      to,
      from: mailFrom(),
      subject,
      text,
      html,
      replyTo: options?.replyTo,
    });
    return true;
  } catch (error) {
    console.error(`[mailer] Не удалось отправить письмо (кому: ${to}, тема: ${subject}):`, error);
    return false;
  } finally {
    transport?.close();
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string) {
  const text = `Перейдите по ссылке, чтобы подтвердить регистрацию: ${verifyUrl}\n\nСсылка действует 24 часа.`;
  const html = `<p>Перейдите по ссылке, чтобы подтвердить регистрацию:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>Ссылка действует 24 часа.</p>`;
  await sendMail(to, "Подтвердите регистрацию — Peloton Ridder", text, html);
}

export async function sendEmailChangeEmail(to: string, confirmUrl: string) {
  const text = `Перейдите по ссылке, чтобы подтвердить новый адрес: ${confirmUrl}\n\nСсылка действует 24 часа. Если вы не запрашивали смену email, просто проигнорируйте это письмо.`;
  const html = `<p>Перейдите по ссылке, чтобы подтвердить новый адрес электронной почты:</p><p><a href="${confirmUrl}">${confirmUrl}</a></p><p>Ссылка действует 24 часа.</p>`;
  await sendMail(to, "Подтвердите новый email — Peloton Ridder", text, html);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const text = `Перейдите по ссылке, чтобы задать новый пароль: ${resetUrl}\n\nСсылка действует 24 часа. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.`;
  const html = `<p>Перейдите по ссылке, чтобы задать новый пароль:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ссылка действует 24 часа. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>`;
  await sendMail(to, "Сброс пароля — Peloton Ridder", text, html);
}

export async function sendAdminAlertEmail(
  adminEmails: string[],
  event: string,
  targetUser: string,
  actor: string,
  timestamp: Date,
) {
  if (adminEmails.length === 0) return;
  const ts = new Intl.DateTimeFormat("ru", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Almaty" }).format(timestamp);
  const text = `Административное событие — Peloton Ridder\n\nСобытие: ${event}\nПользователь: ${targetUser}\nКем выполнено: ${actor}\nВремя: ${ts}`;
  const html = `<h3 style="margin:0 0 12px">Административное событие</h3><table style="border-collapse:collapse;font-size:14px"><tr><td style="padding:4px 16px 4px 0;color:#888">Событие</td><td style="font-weight:600">${event}</td></tr><tr><td style="padding:4px 16px 4px 0;color:#888">Пользователь</td><td>${targetUser}</td></tr><tr><td style="padding:4px 16px 4px 0;color:#888">Кем выполнено</td><td>${actor}</td></tr><tr><td style="padding:4px 16px 4px 0;color:#888">Время</td><td>${ts}</td></tr></table><p style="color:#888;font-size:12px;margin-top:16px">Peloton Ridder</p>`;
  await Promise.all(adminEmails.map((to) => sendMail(to, `[Ridder Admin] ${event}`, text, html)));
}

export async function sendOrganizerMessageEmail(
  userName: string,
  userEmail: string,
  userPhone: string | null,
  raceName: string,
  message: string,
): Promise<boolean> {
  try {
    const recipients = await resolveOrganizerInboxEmails();
    if (recipients.length === 0) {
      console.error("[mailer] Нет email организатора в настройках контактов.");
      return false;
    }
    const subject = `[Ridder] Сообщение от участника — ${raceName}`;
    const phoneRow = userPhone ? `\nТелефон: ${userPhone}` : "";
    const safeName = escapeHtml(userName);
    const safeEmail = escapeHtml(userEmail);
    const safeTopic = escapeHtml(raceName);
    const safeMessage = escapeHtml(message);
    const phoneHtmlRow = userPhone ? `<tr><td style="padding:4px 16px 4px 0;color:#888">Телефон</td><td><a href="tel:${escapeHtml(userPhone)}">${escapeHtml(userPhone)}</a></td></tr>` : "";
    const text = `Сообщение от участника\n\nИмя: ${userName}\nEmail: ${userEmail}${phoneRow}\nТема: ${raceName}\n\n${message}`;
    const html = `<h3 style="margin:0 0 12px">Сообщение от участника</h3><table style="border-collapse:collapse;font-size:14px"><tr><td style="padding:4px 16px 4px 0;color:#888">Имя</td><td style="font-weight:600">${safeName}</td></tr><tr><td style="padding:4px 16px 4px 0;color:#888">Email</td><td><a href="mailto:${safeEmail}">${safeEmail}</a></td></tr>${phoneHtmlRow}<tr><td style="padding:4px 16px 4px 0;color:#888">Тема</td><td>${safeTopic}</td></tr></table><p style="margin:16px 0;white-space:pre-wrap">${safeMessage}</p><p style="color:#888;font-size:12px">Peloton Ridder</p>`;
    const results = await Promise.all(
      recipients.map((to) => sendMail(to, subject, text, html, { replyTo: userEmail })),
    );
    return results.some(Boolean);
  } catch (error) {
    console.error("[mailer] sendOrganizerMessageEmail failed:", error);
    return false;
  }
}

export async function sendContactReceiptEmail(
  to: string,
  name: string,
  topic: string,
  message: string,
): Promise<boolean> {
  const subject = `Ваше сообщение получено — Peloton Ridder`;
  const text = [
    `Здравствуйте, ${name}!`,
    ``,
    `Мы получили ваше сообщение и ответим на ${to}.`,
    ``,
    `Тема: ${topic}`,
    ``,
    message,
    ``,
    `С уважением,`,
    `Peloton Ridder`,
  ].join("\n");
  const html = `
<p>Здравствуйте, ${escapeHtml(name)}!</p>
<p>Мы получили ваше сообщение и ответим на <a href="mailto:${escapeHtml(to)}">${escapeHtml(to)}</a>.</p>
<table style="border-collapse:collapse;font-size:14px;margin:16px 0">
  <tr><td style="padding:4px 16px 4px 0;color:#888">Тема</td><td>${escapeHtml(topic)}</td></tr>
</table>
<p style="white-space:pre-wrap">${escapeHtml(message)}</p>
<p style="color:#888;font-size:13px">С уважением,<br>Peloton Ridder</p>
`.trim();
  return sendMail(to, subject, text, html);
}

export async function sendBroadcastEmail(to: string, name: string, subject: string, body: string) {
  const safeBody = body.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
  const html = `<p>Здравствуйте, ${name}!</p><div style="margin:16px 0;line-height:1.6">${safeBody}</div><p style="color:#888;font-size:12px;margin-top:24px">С уважением,<br>Peloton Ridder</p>`;
  const text = `Здравствуйте, ${name}!\n\n${body}\n\nС уважением,\nPeloton Ridder`;
  await sendMail(to, subject, text, html);
}

export async function sendRefundRequestEmail(
  adminEmails: string[],
  userName: string,
  userEmail: string,
  raceName: string,
  distanceName: string,
  type: "SLOT" | "TRANSFER",
  reason: string | null,
  registrationId: string,
  invoiceId?: string | null,
) {
  if (adminEmails.length === 0) return;
  const typeLabel = type === "SLOT" ? "слот" : "трансфер";
  const adminUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const subject = `[Ridder] Запрос на возврат — ${userName} (${typeLabel})`;
  const invoiceLine = invoiceId ? `Счёт: ${invoiceId}` : "";
  const text = [
    `Запрос на возврат (${typeLabel})`,
    ``,
    `Участник: ${userName} <${userEmail}>`,
    `Забег: ${raceName}`,
    `Дистанция: ${distanceName}`,
    `Тип возврата: ${typeLabel}`,
    invoiceLine,
    reason ? `Причина: ${reason}` : "",
    ``,
    `Подтвердить или отклонить: ${adminUrl}/admin`,
  ].filter((l) => l !== undefined && l !== "").join("\n");
  const html = `<h3 style="margin:0 0 12px">Запрос на возврат (${typeLabel})</h3><table style="border-collapse:collapse;font-size:14px"><tr><td style="padding:4px 16px 4px 0;color:#888">Участник</td><td style="font-weight:600">${userName}</td></tr><tr><td style="padding:4px 16px 4px 0;color:#888">Email</td><td><a href="mailto:${userEmail}">${userEmail}</a></td></tr><tr><td style="padding:4px 16px 4px 0;color:#888">Забег</td><td>${raceName}</td></tr><tr><td style="padding:4px 16px 4px 0;color:#888">Дистанция</td><td>${distanceName}</td></tr><tr><td style="padding:4px 16px 4px 0;color:#888">Тип</td><td>${typeLabel}</td></tr>${invoiceId ? `<tr><td style="padding:4px 16px 4px 0;color:#888">Счёт</td><td style="font-variant-numeric:tabular-nums">${invoiceId}</td></tr>` : ""}${reason ? `<tr><td style="padding:4px 16px 4px 0;color:#888">Причина</td><td>${reason}</td></tr>` : ""}</table><p style="margin-top:16px"><a href="${adminUrl}/admin" style="display:inline-block;padding:8px 16px;background:#EA580C;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px">Перейти в панель</a></p><p style="color:#888;font-size:12px;margin-top:12px">Peloton Ridder</p>`;
  await Promise.all(adminEmails.map((to) => sendMail(to, subject, text, html)));
}

export async function sendWaitlistSlotAvailableEmail(
  to: string,
  name: string,
  raceName: string,
  distanceName: string,
  registerUrl: string,
) {
  const subject = `Место освободилось — ${raceName} · ${distanceName}`;
  const text = [
    `Здравствуйте, ${name}!`,
    ``,
    `Для вас появилось место на дистанции ${distanceName} (${raceName}).`,
    `Зарегистрируйтесь как можно скорее — места распределяются по порядку оплаты:`,
    ``,
    registerUrl,
    ``,
    `С уважением,`,
    `Peloton Ridder`,
  ].join("\n");
  const html = `
<p>Здравствуйте, ${name}!</p>
<p>Для вас появилось место на дистанции <strong>${distanceName}</strong> (${raceName}).</p>
<p>Зарегистрируйтесь как можно скорее — места распределяются по порядку оплаты.</p>
<p style="margin:20px 0">
  <a href="${registerUrl}" style="display:inline-block;padding:10px 20px;background:#EA580C;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">
    Зарегистрироваться
  </a>
</p>
<p style="color:#888;font-size:13px">С уважением,<br>Peloton Ridder</p>
`.trim();
  await sendMail(to, subject, text, html);
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
    `Регистрационный номер: №${bibNumber}`,
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
  <tr><td style="padding:4px 16px 4px 0;color:#888;font-size:13px">Регистрационный номер</td><td style="font-size:20px;font-weight:700;color:#EA580C">№${bibNumber}</td></tr>
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

export async function sendVolunteerStatusEmail(
  to: string,
  name: string,
  raceName: string,
  decision: "APPROVED" | "REJECTED",
  volunteerChatUrl?: string | null,
) {
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const accountUrl = `${appUrl}/ru/account`;

  if (decision === "APPROVED") {
    const subject = `Заявка волонтёра одобрена — ${raceName}`;
    const chatLine = volunteerChatUrl ? `\nЧат волонтёров: ${volunteerChatUrl}` : "";
    const text = [
      `Здравствуйте, ${name}!`,
      ``,
      `Ваша заявка на волонтёрство на ${raceName} одобрена.`,
      `Организаторы свяжутся с вами ближе к событию.${chatLine}`,
      ``,
      `Личный кабинет: ${accountUrl}`,
      ``,
      `С уважением,`,
      `Peloton Ridder`,
    ].join("\n");
    const chatButton = volunteerChatUrl
      ? `<p style="margin:8px 0"><a href="${volunteerChatUrl}" style="display:inline-block;padding:8px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px">Чат волонтёров →</a></p>`
      : "";
    const html = `
<p>Здравствуйте, ${name}!</p>
<p>Ваша заявка на волонтёрство на <strong>${raceName}</strong> <span style="color:#16a34a;font-weight:600">одобрена ✓</span>.</p>
<p>Организаторы свяжутся с вами ближе к событию.</p>
${chatButton}
<p style="margin-top:16px"><a href="${accountUrl}" style="display:inline-block;padding:8px 16px;background:#EA580C;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px">Личный кабинет</a></p>
<p style="color:#888;font-size:13px;margin-top:16px">С уважением,<br>Peloton Ridder</p>
`.trim();
    await sendMail(to, subject, text, html);
  } else {
    const subject = `Заявка волонтёра — ${raceName}`;
    const text = [
      `Здравствуйте, ${name}!`,
      ``,
      `К сожалению, ваша заявка на волонтёрство на ${raceName} отклонена.`,
      `Вы можете подать повторную заявку или обратиться к организаторам.`,
      ``,
      `Личный кабинет: ${accountUrl}`,
      ``,
      `С уважением,`,
      `Peloton Ridder`,
    ].join("\n");
    const html = `
<p>Здравствуйте, ${name}!</p>
<p>К сожалению, ваша заявка на волонтёрство на <strong>${raceName}</strong> <span style="color:#dc2626;font-weight:600">отклонена</span>.</p>
<p>Вы можете подать повторную заявку или обратиться к организаторам.</p>
<p style="margin-top:16px"><a href="${accountUrl}" style="display:inline-block;padding:8px 16px;background:#EA580C;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px">Личный кабинет</a></p>
<p style="color:#888;font-size:13px;margin-top:16px">С уважением,<br>Peloton Ridder</p>
`.trim();
    await sendMail(to, subject, text, html);
  }
}

export async function sendVolunteerApplicationAdminEmail(
  adminEmails: string[],
  applicantName: string,
  applicantEmail: string,
  raceName: string,
) {
  if (adminEmails.length === 0) return;
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const volunteersUrl = `${appUrl}/ru/admin/volunteers`;
  const subject = `[Ridder] Новая заявка волонтёра — ${raceName}`;
  const text = [
    `Новая заявка волонтёра`,
    ``,
    `Участник: ${applicantName} <${applicantEmail}>`,
    `Забег: ${raceName}`,
    ``,
    `Рассмотреть заявки: ${volunteersUrl}`,
  ].join("\n");
  const html = `<h3 style="margin:0 0 12px">Новая заявка волонтёра</h3><table style="border-collapse:collapse;font-size:14px"><tr><td style="padding:4px 16px 4px 0;color:#888">Участник</td><td style="font-weight:600">${applicantName}</td></tr><tr><td style="padding:4px 16px 4px 0;color:#888">Email</td><td><a href="mailto:${applicantEmail}">${applicantEmail}</a></td></tr><tr><td style="padding:4px 16px 4px 0;color:#888">Забег</td><td>${raceName}</td></tr></table><p style="margin-top:16px"><a href="${volunteersUrl}" style="display:inline-block;padding:8px 16px;background:#EA580C;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:13px">Рассмотреть заявки →</a></p><p style="color:#888;font-size:12px;margin-top:12px">Peloton Ridder</p>`;
  await Promise.all(adminEmails.map((to) => sendMail(to, subject, text, html)));
}

const PAYMENT_KIND_LABEL_RU: Record<string, string> = {
  slot: "Слот",
  slotAndTransfer: "Слот + трансфер",
  transfer: "Трансфер",
};

const USER_MESSAGE_COPY: Record<
  string,
  { title: string; body: (race: string, amount: string, kind: string) => string }
> = {
  REGISTRATION: {
    title: "Регистрация на забег",
    body: (race) => `Вы зарегистрировались на ${race}.`,
  },
  PAYMENT: {
    title: "Оплата получена",
    body: (race, amount, kind) =>
      amount
        ? `Оплата за ${race} получена: ${amount}${kind ? ` · ${kind}` : ""}.`
        : `Оплата за ${race} получена.`,
  },
  ADMIN_CANCEL: {
    title: "Регистрация отменена",
    body: (race) => `Администратор отменил вашу регистрацию на ${race}.`,
  },
  REREGISTRATION_ALLOWED: {
    title: "Повторная регистрация разрешена",
    body: (race) => `Вам разрешена повторная регистрация на ${race}.`,
  },
  REFUND_SLOT: {
    title: "Возврат за слот",
    body: (race, amount) => `Произведён возврат за слот на ${race} на сумму ${amount}.`,
  },
  REFUND_TRANSFER: {
    title: "Возврат за трансфер",
    body: (race, amount) => `Произведён возврат за трансфер на ${race} на сумму ${amount}.`,
  },
  VOLUNTEER_APPLICATION: {
    title: "Заявка волонтёра",
    body: (race) => `Поступила новая заявка волонтёра на ${race}.`,
  },
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendUserMessageEmail(
  to: string,
  name: string,
  type: string,
  payload: { race: string; amount?: number; kind?: string },
) {
  const copy = USER_MESSAGE_COPY[type];
  if (!copy) return;

  const amount =
    payload.amount != null
      ? new Intl.NumberFormat("ru-KZ", {
          style: "currency",
          currency: "KZT",
          maximumFractionDigits: 0,
        }).format(payload.amount)
      : "";
  const kind = payload.kind ? PAYMENT_KIND_LABEL_RU[payload.kind] ?? "" : "";
  const body = copy.body(payload.race, amount, kind);
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const messagesUrl = `${appUrl}/ru/account/messages`;
  const subject = `${copy.title} — ${payload.race}`;
  const text = [
    `Здравствуйте, ${name}!`,
    ``,
    body,
    ``,
    `Сообщение также доступно в личном кабинете: ${messagesUrl}`,
    ``,
    `С уважением,`,
    `Peloton Ridder`,
  ].join("\n");
  const html = `
<p>Здравствуйте, ${escapeHtml(name)}!</p>
<p>${escapeHtml(body)}</p>
<p style="margin:20px 0">
  <a href="${messagesUrl}" style="display:inline-block;padding:10px 20px;background:#EA580C;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;font-size:14px">
    Открыть сообщения
  </a>
</p>
<p style="color:#888;font-size:13px">С уважением,<br>Peloton Ridder</p>
`.trim();
  await sendMail(to, subject, text, html);
}
