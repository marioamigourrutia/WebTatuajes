import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Next security configuration", () => {
  it("adds HSTS only for production and keeps legacy/admin routes out of indexing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { default: config } = await import("./next.config");
    const rules = await config.headers?.();

    expect(rules).toBeDefined();
    const globalRule = rules?.find((rule) => rule.source === "/(.*)");
    expect(globalRule?.headers).toContainEqual({
      key: "Strict-Transport-Security",
      value: "max-age=31536000",
    });

    for (const source of ["/admin/:path*", "/servicios", "/tienda", "/manejo-imagenes"]) {
      expect(rules).toContainEqual(
        expect.objectContaining({
          source,
          headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
        }),
      );
    }
  });

  it("does not emit HSTS for development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { default: config } = await import("./next.config");
    const rules = await config.headers?.();
    const globalRule = rules?.find((rule) => rule.source === "/(.*)");

    expect(globalRule?.headers.some((header) => header.key === "Strict-Transport-Security")).toBe(
      false,
    );
  });
});
