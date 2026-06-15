import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl } from "./whatsapp";

describe("buildWhatsAppUrl", () => {
  it("normalizes the phone number and encodes the message", () => {
    expect(buildWhatsAppUrl({ phone: "+56 9 1234 5678", message: "Hola, quiero cotizar" })).toBe(
      "https://wa.me/56912345678?text=Hola%2C+quiero+cotizar",
    );
  });

  it("rejects empty phone numbers", () => {
    expect(() => buildWhatsAppUrl({ phone: "", message: "Hola" })).toThrow(
      "WhatsApp phone number is required",
    );
  });
});
