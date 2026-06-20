import { describe, expect, it } from "vitest";
import ShopPage, { metadata } from "./page";

describe("shop page", () => {
  it("describes available works and WhatsApp coordination", () => {
    expect(metadata.title).toBe("Obras disponibles");
    expect(metadata.description).toContain("sin pagos en línea");
  });

  it("renders public catalog cards without hidden products", () => {
    const page = ShopPage();
    const content = JSON.stringify(page);

    expect(content).toContain("Obras disponibles");
    expect(content).toContain("OBR-001");
    expect(content).toContain("Solicitar compra");
    expect(content).not.toContain("Borrador interno");
  });
});
