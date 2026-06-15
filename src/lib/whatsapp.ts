type WhatsAppLinkInput = {
  phone: string;
  message: string;
};

export function buildWhatsAppUrl({ phone, message }: WhatsAppLinkInput): string {
  const normalizedPhone = phone.replace(/\D/g, "");

  if (!normalizedPhone) {
    throw new Error("WhatsApp phone number is required to build a click-to-chat URL.");
  }

  const params = new URLSearchParams({ text: message });

  return `https://wa.me/${normalizedPhone}?${params.toString()}`;
}
