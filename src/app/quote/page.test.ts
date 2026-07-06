import { describe, expect, it, vi } from "vitest";
import QuotePage from "./page";

vi.mock("@/lib/images/upload-provider", () => ({
  isExternalImageUploadConfigured: () => false,
}));

vi.mock("@/lib/quotes/quote-request-form", () => ({
  QuoteRequestForm: () => null,
}));

describe("quote page", () => {
  it("explains quote creation before sending references through WhatsApp", () => {
    const content = JSON.stringify(QuotePage());

    expect(content).toContain("Crearemos tu cotización");
    expect(content).toContain("abriremos WhatsApp");
    expect(content).toContain("enviar fotos o referencias directamente al estudio");
    expect(content).not.toContain("verificaremos tu");
    expect(content).not.toContain("enlace de acceso sin contraseña");
  });
});
