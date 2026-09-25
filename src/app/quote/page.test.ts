import { describe, expect, it, vi } from "vitest";
import QuotePage from "./page";

vi.mock("@/lib/images/upload-provider", () => ({
  isExternalImageUploadConfigured: () => false,
}));

vi.mock("@/lib/quotes/quote-request-form", () => ({
  QuoteRequestForm: () => null,
}));

describe("quote page", () => {
  it("explains quote creation and the WhatsApp continuation without promising automatic approval", () => {
    const content = JSON.stringify(QuotePage());

    expect(content).toContain("código de cotización");
    expect(content).toContain("continuar por WhatsApp");
    expect(content).toContain("Datos para cotizar");
    expect(content).not.toContain("verificaremos tu");
    expect(content).not.toContain("enlace de acceso sin contraseña");
  });
});
