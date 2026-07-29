"use server";

import { sendOrganizerMessageEmail } from "@/lib/mailer";

type ContactState = { error?: string; success?: boolean };

export async function sendContactAction(
  _prevState: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = (formData.get("name") as string | null)?.trim() ?? "";
  const email = (formData.get("email") as string | null)?.trim() ?? "";
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const subject = (formData.get("subject") as string | null)?.trim() ?? "";
  const message = (formData.get("message") as string | null)?.trim() ?? "";

  if (!name || name.length < 2) return { error: "invalid_name" };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "invalid_email" };
  if (!message || message.length < 10) return { error: "message_too_short" };

  await sendOrganizerMessageEmail(
    name,
    email,
    phone,
    subject || "Контактная форма",
    message,
  );

  return { success: true };
}
