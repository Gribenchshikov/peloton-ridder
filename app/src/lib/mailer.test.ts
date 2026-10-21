import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  buildSmtpOptions,
  isSafeFromAddress,
  isSafeMailbox,
  sanitizeMailHeader,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendVolunteerRewardEmail,
  sendVolunteerStatusEmail,
  takeCapturedMail,
} from "./mailer";

afterEach(() => {
  delete process.env.MAIL_JSON_TRANSPORT;
  takeCapturedMail();
});

function enableJsonTransport() {
  process.env.MAIL_JSON_TRANSPORT = "1";
  assert.notEqual(process.env.NODE_ENV, "production");
}

test("verification email keeps the confirmation link and does not open SMTP", async () => {
  enableJsonTransport();
  await sendVerificationEmail("runner@example.com", "https://ridder.example/verify?token=abc");
  const [mail] = takeCapturedMail();
  assert.equal(mail?.to?.[0]?.address, "runner@example.com");
  assert.match(mail?.subject ?? "", /Подтвердите регистрацию/);
  assert.match(mail?.text ?? "", /https:\/\/ridder\.example\/verify\?token=abc/);
  assert.match(mail?.html ?? "", /https:\/\/ridder\.example\/verify\?token=abc/);
});

test("password reset email keeps the reset link", async () => {
  enableJsonTransport();
  await sendPasswordResetEmail("runner@example.com", "https://ridder.example/reset-password?token=rst");
  const [mail] = takeCapturedMail();
  assert.equal(mail?.to?.[0]?.address, "runner@example.com");
  assert.match(mail?.subject ?? "", /Сброс пароля/);
  assert.match(mail?.text ?? "", /token=rst/);
  assert.match(mail?.html ?? "", /token=rst/);
});

test("volunteer decision emails keep the race name and the decision", async () => {
  enableJsonTransport();
  await sendVolunteerStatusEmail("vol@example.com", "Anna", "Altai 100", "APPROVED", "https://chat.example/vol");
  await sendVolunteerStatusEmail("vol@example.com", "Anna", "Altai 100", "REJECTED");
  const [approved, rejected] = takeCapturedMail();
  assert.match(approved?.subject ?? "", /одобрена — Altai 100/);
  assert.match(approved?.html ?? "", /одобрена/);
  assert.match(approved?.html ?? "", /https:\/\/chat\.example\/vol/);
  assert.match(rejected?.subject ?? "", /Altai 100/);
  assert.match(rejected?.html ?? "", /отклонена/);
  assert.doesNotMatch(rejected?.html ?? "", /chat\.example/);
});

test("volunteer promo email keeps the code and the three texts", async () => {
  enableJsonTransport();
  const previousFrom = process.env.SMTP_FROM;
  process.env.SMTP_FROM = "Peloton Ridder <noreply@example.com>";
  try {
    const sent = await sendVolunteerRewardEmail("vol@example.com", "Текст RU", "Мәтін KK", "Text EN", "RIDER-100");
    assert.equal(sent, true);
  } finally {
    if (previousFrom === undefined) delete process.env.SMTP_FROM;
    else process.env.SMTP_FROM = previousFrom;
  }
  const [mail] = takeCapturedMail();
  assert.equal(mail?.from?.address, "noreply@example.com");
  assert.equal(mail?.subject, "Peloton Ridder — ваш промокод");
  assert.match(mail?.html ?? "", /RIDER-100/);
  assert.match(mail?.html ?? "", /Текст RU/);
  assert.match(mail?.html ?? "", /Мәтін KK/);
  assert.match(mail?.html ?? "", /Text EN/);
  assert.equal(mail?.text, undefined);
});

test("volunteer promo email escapes HTML in the code and the three texts", async () => {
  enableJsonTransport();
  const previousFrom = process.env.SMTP_FROM;
  process.env.SMTP_FROM = "Peloton Ridder <noreply@example.com>";
  try {
    const sent = await sendVolunteerRewardEmail(
      "vol@example.com",
      `<b>RU</b><script>alert("ru")</script>`,
      `kk<img src=x onerror=alert(1)>`,
      `en&" onclick="alert(1)`,
      `CODE"><script>alert(1)</script>`,
    );
    assert.equal(sent, true);
  } finally {
    if (previousFrom === undefined) delete process.env.SMTP_FROM;
    else process.env.SMTP_FROM = previousFrom;
  }
  const html = takeCapturedMail()[0]?.html ?? "";
  assert.doesNotMatch(html, /<script/i);
  assert.doesNotMatch(html, /<img/i);
  assert.doesNotMatch(html, /<b>/);
  assert.match(html, /&lt;b&gt;RU&lt;\/b&gt;&lt;script&gt;alert\(&quot;ru&quot;\)&lt;\/script&gt;/);
  assert.match(html, /kk&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /en&amp;&quot; onclick=&quot;alert\(1\)/);
  assert.match(html, /CODE&quot;&gt;&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /<h2 style="color:#E2531F;">Peloton Ridder<\/h2>/);
});

test("rejects a recipient with a header injection and sends nothing", async () => {
  enableJsonTransport();
  await sendVerificationEmail("runner@example.com\r\nBcc: evil@example.com", "https://ridder.example/verify?token=abc");
  assert.deepEqual(takeCapturedMail(), []);
});

test("strips line breaks from the subject before the message is built", async () => {
  enableJsonTransport();
  await sendVolunteerStatusEmail("vol@example.com", "Anna", "Race\r\nBcc: evil@example.com", "APPROVED");
  const [mail] = takeCapturedMail();
  assert.equal(mail?.subject, "Заявка волонтёра одобрена — Race  Bcc: evil@example.com");
  assert.doesNotMatch(mail?.subject ?? "", /[\r\n\0]/);
  assert.equal(sanitizeMailHeader("a\r\nb\0c"), "a  b c");
  assert.equal(isSafeMailbox("runner@example.com"), true);
  assert.equal(isSafeMailbox("runner@example.com\n"), false);
  assert.equal(isSafeFromAddress("Peloton Ridder <noreply@example.com>"), true);
  assert.equal(isSafeFromAddress("bad\r\nfrom@example.com"), false);
});

test("SMTP options force TLS 1.2 and implicit TLS on port 465", () => {
  const implicit = buildSmtpOptions({
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "465",
    SMTP_USER: "mailer",
    SMTP_PASS: "test-only",
  });
  assert.equal(implicit.secure, true);
  assert.equal(implicit.port, 465);
  assert.equal("requireTLS" in implicit, false);
  assert.equal(implicit.tls.minVersion, "TLSv1.2");
  assert.equal(implicit.auth?.user, "mailer");

  const starttls = buildSmtpOptions({
    SMTP_HOST: "smtp.example.com",
    SMTP_PORT: "587",
    SMTP_SECURE: "false",
  });
  assert.equal(starttls.secure, false);
  assert.equal(starttls.requireTLS, true);
  assert.equal(starttls.auth, undefined);
  assert.equal(starttls.connectionTimeout, 12_000);
});
