import { describe, expect, it } from "vitest";
import { buildQuoteMailtoUrl, buildQuoteWhatsAppUrl } from "./contact-links";

const quote = {
  id: "quote-123",
  customerName: "Ana Cliente",
  email: "ana+test@example.test",
  phone: "+56 9 1234 5678",
  bodyPlacement: "Antebrazo",
  approximateSize: "10 cm",
};

describe("quote contact links", () => {
  it("builds a mailto link with encoded quote context", () => {
    expect(buildQuoteMailtoUrl(quote)).toContain("mailto:ana%2Btest%40example.test?");
    expect(buildQuoteMailtoUrl(quote)).toContain("subject=Cotizaci%C3%B3n+de+tatuaje+quote-123");
    expect(buildQuoteMailtoUrl(quote)).toContain("Antebrazo+%2810+cm%29");
  });

  it("builds a WhatsApp link with normalized phone and encoded quote context", () => {
    const url = buildQuoteWhatsAppUrl(quote);
    const message = new URL(url ?? "").searchParams.get("text") ?? "";

    expect(url).toContain("https://wa.me/56912345678?");
    expect(message).toContain("solicitud de cotización quote-123 para Antebrazo (10 cm)");
    expect(message).toContain("coordinar referencias, disponibilidad y próximos pasos");
  });

  it("omits WhatsApp when the quote has no phone", () => {
    expect(buildQuoteWhatsAppUrl({ ...quote, phone: null })).toBeNull();
  });

  it("omits WhatsApp when the quote phone has no digits", () => {
    expect(buildQuoteWhatsAppUrl({ ...quote, phone: "sin teléfono" })).toBeNull();
  });
});
