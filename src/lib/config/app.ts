export const appConfig = {
  locale: process.env.NEXT_PUBLIC_APP_LOCALE ?? "es-CL",
  timeZone: process.env.NEXT_PUBLIC_APP_TIME_ZONE ?? "America/Santiago",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  whatsappPhone: process.env.NEXT_PUBLIC_WHATSAPP_PHONE ?? "56900000000",
  whatsappMessage:
    process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE ?? "Hola, quiero consultar por un tatuaje.",
} as const;
