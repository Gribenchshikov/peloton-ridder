"use server";

import { sendContactReceiptEmail, sendOrganizerMessageEmail } from "@/lib/mailer";
import { notifyAdminsOrganizerMessage } from "@/lib/userMessages";

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

  const topic = subject || "Контактная форма";
  try {
    const delivered = await sendOrganizerMessageEmail(name, email, phone, topic, message);
    if (!delivered) return { error: "send_failed" };
    await notifyAdminsOrganizerMessage({
      name,
      email,
      phone,
      topic,
      text: message,
    });
    void sendContactReceiptEmail(email, name, topic, message).catch((error) => {
      console.error("[contact] receipt email failed:", error);
    });
    return { success: true };
  } catch (error) {
    console.error("[contact] sendContactAction failed:", error);
    return { error: "send_failed" };
  }
}
