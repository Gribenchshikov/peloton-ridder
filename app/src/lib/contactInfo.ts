export type PhoneChannel = "calls" | "whatsapp";

export type ContactInfo = {
  phone1: string;
  phone2: string;
  email: string;
  phone1Enabled: boolean;
  phone2Enabled: boolean;
  phone1Channels: PhoneChannel[];
  phone2Channels: PhoneChannel[];
};

export const DEFAULT_CONTACT: ContactInfo = {
  phone1: "+7 700 000 0000",
  phone2: "+7 700 000 0001",
  email: "info@ridder.run",
  phone1Enabled: true,
  phone2Enabled: true,
  phone1Channels: ["calls"],
  phone2Channels: ["calls"],
};

function asChannels(value: unknown): PhoneChannel[] {
  const list = Array.isArray(value)
    ? value.filter((item): item is PhoneChannel => item === "calls" || item === "whatsapp")
    : [];
  return list.length > 0 ? [...new Set(list)] : ["calls"];
}

export function parseContactInfo(raw: string | null | undefined): ContactInfo {
  if (!raw) return DEFAULT_CONTACT;
  try {
    const parsed = JSON.parse(raw) as Partial<ContactInfo>;
    return {
      ...DEFAULT_CONTACT,
      phone1: typeof parsed.phone1 === "string" && parsed.phone1.trim() ? parsed.phone1 : DEFAULT_CONTACT.phone1,
      phone2: typeof parsed.phone2 === "string" && parsed.phone2.trim() ? parsed.phone2 : DEFAULT_CONTACT.phone2,
      email: typeof parsed.email === "string" && parsed.email.trim() ? parsed.email : DEFAULT_CONTACT.email,
      phone1Enabled: parsed.phone1Enabled !== false,
      phone2Enabled: parsed.phone2Enabled !== false,
      phone1Channels: asChannels(parsed.phone1Channels),
      phone2Channels: asChannels(parsed.phone2Channels),
    };
  } catch {
    return DEFAULT_CONTACT;
  }
}

export type VisiblePhone = {
  key: "phone1" | "phone2";
  number: string;
  channels: PhoneChannel[];
};

export function visiblePhones(info: ContactInfo): VisiblePhone[] {
  const phones: VisiblePhone[] = [];
  if (info.phone1Enabled && info.phone1.trim()) {
    phones.push({ key: "phone1", number: info.phone1.trim(), channels: asChannels(info.phone1Channels) });
  }
  if (info.phone2Enabled && info.phone2.trim()) {
    phones.push({ key: "phone2", number: info.phone2.trim(), channels: asChannels(info.phone2Channels) });
  }
  return phones;
}

export function phoneHref(number: string, channels: PhoneChannel[]) {
  const digits = number.replace(/\D/g, "");
  if (channels.includes("calls") || !channels.includes("whatsapp")) {
    return `tel:${number.replace(/\s/g, "")}`;
  }
  return `https://wa.me/${digits}`;
}

export function whatsappHref(number: string) {
  return `https://wa.me/${number.replace(/\D/g, "")}`;
}

export function sanitizeContactInfo(info: ContactInfo): ContactInfo {
  return {
    phone1: info.phone1.trim(),
    phone2: info.phone2.trim(),
    email: info.email.trim(),
    phone1Enabled: Boolean(info.phone1Enabled),
    phone2Enabled: Boolean(info.phone2Enabled),
    phone1Channels: asChannels(info.phone1Channels),
    phone2Channels: asChannels(info.phone2Channels),
  };
}
