import { describe, expect, it, vi } from "vitest";
import { appConfig } from "@/lib/config/app";

const redirect = vi.fn();

vi.mock("next/navigation", () => ({ redirect }));

describe("legacy portfolio route", () => {
  it("redirects the duplicate portfolio route to Instagram", async () => {
    const { default: PortfolioRedirectPage, metadata } = await import("./page");

    PortfolioRedirectPage();

    expect(metadata.title).toBe("Instagram");
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(redirect).toHaveBeenCalledWith(appConfig.instagramUrl || "/");
  });
});
