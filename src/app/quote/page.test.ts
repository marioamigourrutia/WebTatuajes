import { describe, expect, it, vi } from "vitest";
import QuotePage from "./page";

vi.mock("@/lib/images/upload-provider", () => ({
  isExternalImageUploadConfigured: () => false,
}));

vi.mock("@/lib/quotes/quote-request-form", () => ({
  QuoteRequestForm: () => null,
}));

describe("quote page", () => {
  it("explains passwordless email verification instead of claiming no sign-in is needed", () => {
    const content = JSON.stringify(QuotePage());

    expect(content).toContain("verificaremos tu");
    expect(content).toContain("enlace de acceso sin contraseña");
    expect(content).not.toContain("No necesitas iniciar sesión");
  });
});
