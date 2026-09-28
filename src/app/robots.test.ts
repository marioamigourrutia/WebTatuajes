import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots metadata", () => {
  it("keeps public pages crawlable while excluding admin and API endpoints", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules).toEqual(
      expect.objectContaining({
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      }),
    );
    expect(result.sitemap).toBe("/sitemap.xml");
  });
});
