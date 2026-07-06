import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  getRateLimitOptions,
  getRequestRateLimitKey,
  resetRateLimitForTests,
} from "./rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-05T12:00:00.000Z"));
    resetRateLimitForTests();
    delete process.env.RATE_LIMIT_DEFAULT_LIMIT;
    delete process.env.RATE_LIMIT_DEFAULT_WINDOW_MS;
    delete process.env.RATE_LIMIT_QUOTES_LIMIT;
    delete process.env.RATE_LIMIT_QUOTES_WINDOW_MS;
    delete process.env.RATE_LIMIT_COMMUNITY_MEMBERS_UNSUBSCRIBE_LIMIT;
    delete process.env.RATE_LIMIT_COMMUNITY_MEMBERS_UNSUBSCRIBE_WINDOW_MS;
  });

  afterEach(() => {
    resetRateLimitForTests();
    vi.useRealTimers();
  });

  it("returns 429 after the configured threshold within the same window", () => {
    expect(checkRateLimit("quotes:127.0.0.1", { limit: 2, windowMs: 60_000 })).toEqual({
      ok: true,
      remaining: 1,
    });
    expect(checkRateLimit("quotes:127.0.0.1", { limit: 2, windowMs: 60_000 })).toEqual({
      ok: true,
      remaining: 0,
    });

    expect(checkRateLimit("quotes:127.0.0.1", { limit: 2, windowMs: 60_000 })).toEqual({
      ok: false,
      status: 429,
      message: "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
    });
  });

  it("resets the in-memory bucket after the configured window", () => {
    expect(checkRateLimit("quotes:127.0.0.1", { limit: 1, windowMs: 60_000 }).ok).toBe(true);
    expect(checkRateLimit("quotes:127.0.0.1", { limit: 1, windowMs: 60_000 }).ok).toBe(false);

    vi.advanceTimersByTime(60_001);

    expect(checkRateLimit("quotes:127.0.0.1", { limit: 1, windowMs: 60_000 })).toEqual({
      ok: true,
      remaining: 0,
    });
  });

  it("keys requests by scope and first forwarded IP", () => {
    const request = new Request("http://localhost/api/quotes", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });

    expect(getRequestRateLimitKey(request, "quotes")).toBe("quotes:203.0.113.10");
  });

  it("reads positive env overrides per scope with default fallback", () => {
    process.env.RATE_LIMIT_DEFAULT_LIMIT = "7";
    process.env.RATE_LIMIT_DEFAULT_WINDOW_MS = "30000";
    process.env.RATE_LIMIT_QUOTES_LIMIT = "3";
    process.env.RATE_LIMIT_QUOTES_WINDOW_MS = "15000";
    process.env.RATE_LIMIT_COMMUNITY_MEMBERS_UNSUBSCRIBE_LIMIT = "2";
    process.env.RATE_LIMIT_COMMUNITY_MEMBERS_UNSUBSCRIBE_WINDOW_MS = "45000";

    expect(getRateLimitOptions("quotes")).toEqual({ limit: 3, windowMs: 15000 });
    expect(getRateLimitOptions("community-members-unsubscribe")).toEqual({
      limit: 2,
      windowMs: 45000,
    });
    expect(getRateLimitOptions("unknown-scope")).toEqual({ limit: 7, windowMs: 30000 });
  });
});
