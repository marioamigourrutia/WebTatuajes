import { describe, expect, it } from "vitest";
import { buildPurchaseWhatsAppMessage, buildPurchaseWhatsAppUrl } from "./contact-links";

const purchaseInput = {
  requestCode: "COM-2026-ABCDE",
  customerName: "Ana Cliente",
  customerPhone: "+56 9 1234 5678",
  customerEmail: "ana@example.test",
  product: {
    code: "OBR-001",
    title: "Peonía en línea fina",
    description:
      "Diseño disponible para brazo o pierna. Se ajusta tamaño y ubicación antes de reservar.",
    priceClp: 85000,
  },
};

describe("purchase contact links", () => {
  it("builds a clear WhatsApp message without sending automatically", () => {
    const message = buildPurchaseWhatsAppMessage(purchaseInput);

    expect(message).toContain("Obra: Peonía en línea fina");
    expect(message).toContain("Código de obra: OBR-001");
    expect(message).toContain("Precio referencial: $85.000");
    expect(message).toContain("Se ajusta tamaño y ubicación antes de reservar");
    expect(message).toContain("Código de solicitud: COM-2026-ABCDE");
    expect(message).toContain("coordinar disponibilidad, ubicación final, tamaño y próximos pasos");
    expect(message).toContain("Entiendo que este mensaje no confirma reserva ni pago");
  });

  it("builds a click-to-chat URL when the studio phone is configured", () => {
    const url = buildPurchaseWhatsAppUrl({ ...purchaseInput, studioPhone: "+56 9 0000 0000" });

    expect(url).toContain("https://wa.me/56900000000?");
    expect(decodeURIComponent(url ?? "")).toContain("COM-2026-ABCDE");
  });

  it("returns null when no WhatsApp phone is configured", () => {
    expect(buildPurchaseWhatsAppUrl({ ...purchaseInput, studioPhone: "" })).toBeNull();
  });
});
