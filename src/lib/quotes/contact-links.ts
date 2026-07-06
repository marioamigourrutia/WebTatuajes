import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

type QuoteContactInput = {
  id: string;
  quoteCode?: string;
  customerName: string;
  email: string;
  phone: string | null;
  bodyPlacement: string;
  approximateSize: string;
};

export function buildQuoteMailtoUrl(quote: QuoteContactInput): string {
  const code = quote.quoteCode ?? quote.id;
  const subject = `Cotización de tatuaje ${code}`;
  const body = `Hola ${quote.customerName},\n\nTe contactamos por tu solicitud de cotización para ${quote.bodyPlacement} (${quote.approximateSize}).\n\n`;
  const params = new URLSearchParams({ subject, body });

  return `mailto:${encodeURIComponent(quote.email)}?${params.toString()}`;
}

export function buildQuoteWhatsAppUrl(quote: QuoteContactInput): string | null {
  if (!quote.phone || !hasWhatsAppConfig(quote.phone)) {
    return null;
  }

  return buildWhatsAppUrl({
    phone: quote.phone,
    message: `Hola ${quote.customerName}, te contactamos por tu solicitud de cotización ${quote.quoteCode ?? quote.id} para ${quote.bodyPlacement} (${quote.approximateSize}). Queremos coordinar referencias, disponibilidad y próximos pasos contigo.`,
  });
}
