import { describe, expect, it } from "vitest";
import { metadata } from "./page";

describe("contact page metadata", () => {
  it("describes contact, agenda and quote support expectations", () => {
    expect(metadata.title).toBe("Contacto");
    expect(metadata.description).toContain("Contacto, agenda y soporte");
    expect(metadata.description).toContain("cotizaciones de tatuajes personalizados");
  });
});
