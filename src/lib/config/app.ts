const fallbackWhatsAppPhone = "+56977616917";
const fallbackInstagramUrl = "https://www.instagram.com/marioamigotattoo/";
const placeholderWhatsAppPhone = ["569", "0000", "0000"].join("");

function resolveWhatsAppPhone(value: string | undefined): string {
  const trimmedValue = value?.trim();
  const normalizedValue = trimmedValue?.replace(/\D/g, "");

  if (!trimmedValue || normalizedValue === placeholderWhatsAppPhone) {
    return fallbackWhatsAppPhone;
  }

  return trimmedValue;
}

function resolvePublicUrl(value: string | undefined, fallback = ""): string {
  const trimmedValue = value?.trim() || fallback;
  if (!trimmedValue) return "";

  try {
    const url = new URL(trimmedValue);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export const appConfig = {
  brandName: "Mario Amigo Tattoo",
  brandHandle: "@marioamigotattoo",
  studioName: process.env.NEXT_PUBLIC_STUDIO_NAME ?? "Mario Amigo Tattoo",
  artistName: process.env.NEXT_PUBLIC_ARTIST_NAME ?? "Mario Amigo Urrutia",
  locale: process.env.NEXT_PUBLIC_APP_LOCALE ?? "es-CL",
  timeZone: process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "America/Santiago",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsappPhone: resolveWhatsAppPhone(process.env.NEXT_PUBLIC_WHATSAPP_PHONE),
  whatsappMessage:
    process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE ??
    "Hola Mario, quiero consultar por un tatuaje y solicitar una cotización.",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ?? "",
  instagramUrl: resolvePublicUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL, fallbackInstagramUrl),
} as const;
