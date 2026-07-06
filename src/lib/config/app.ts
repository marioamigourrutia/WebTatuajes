const fallbackWhatsAppPhone = "+56977616917";
const placeholderWhatsAppPhone = ["569", "0000", "0000"].join("");

function resolveWhatsAppPhone(value: string | undefined): string {
  const trimmedValue = value?.trim();
  const normalizedValue = trimmedValue?.replace(/\D/g, "");

  if (!trimmedValue || normalizedValue === placeholderWhatsAppPhone) {
    return fallbackWhatsAppPhone;
  }

  return trimmedValue;
}

export const appConfig = {
  studioName: process.env.NEXT_PUBLIC_STUDIO_NAME ?? "HuespedTattooStudio",
  artistName: process.env.NEXT_PUBLIC_ARTIST_NAME ?? "Mario Amigo Urrutia",
  locale: process.env.NEXT_PUBLIC_APP_LOCALE ?? "es-CL",
  timeZone: process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "America/Santiago",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsappPhone: resolveWhatsAppPhone(process.env.NEXT_PUBLIC_WHATSAPP_PHONE),
  whatsappMessage:
    process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE ??
    "Hola HuespedTattooStudio, quiero consultar por un tatuaje.",
} as const;
