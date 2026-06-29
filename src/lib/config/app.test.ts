import { describe, expect, it, vi } from "vitest";

async function loadAppConfigWithPhone(phone: string | undefined) {
  vi.resetModules();

  if (phone === undefined) {
    delete process.env.NEXT_PUBLIC_WHATSAPP_PHONE;
  } else {
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE = phone;
  }

  const { appConfig } = await import("./app");
  return appConfig;
}

describe("appConfig", () => {
  it("uses the real studio WhatsApp number by default", async () => {
    const config = await loadAppConfigWithPhone(undefined);

    expect(config.whatsappPhone).toBe("+56977616917");
  });

  it("replaces the placeholder WhatsApp number with the real studio number", async () => {
    const config = await loadAppConfigWithPhone("+56 9 0000 0000");

    expect(config.whatsappPhone).toBe("+56977616917");
  });

  it("keeps a configured non-placeholder WhatsApp number", async () => {
    const config = await loadAppConfigWithPhone("+56912345678");

    expect(config.whatsappPhone).toBe("+56912345678");
  });
});
