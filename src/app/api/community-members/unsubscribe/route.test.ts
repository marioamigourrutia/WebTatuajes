import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { unsubscribeCommunityMember } from "@/lib/community/member";
import { resetRateLimitForTests } from "@/lib/rate-limit";

vi.mock("@/lib/community/member", () => ({
  unsubscribeCommunityMember: vi.fn(),
}));

const unsubscribeCommunityMemberMock = vi.mocked(unsubscribeCommunityMember);

function request(body: unknown, headers?: HeadersInit) {
  return new Request("http://localhost/api/community-members/unsubscribe", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function botFields() {
  return { companyWebsite: "", submittedAt: String(Date.now() - 3000) };
}

describe("community member unsubscribe route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetRateLimitForTests();
    delete process.env.RATE_LIMIT_COMMUNITY_MEMBERS_UNSUBSCRIBE_LIMIT;
    delete process.env.RATE_LIMIT_COMMUNITY_MEMBERS_UNSUBSCRIBE_WINDOW_MS;
    unsubscribeCommunityMemberMock.mockResolvedValue({ ok: true });
  });

  it("is public and returns generic ok for unsubscribe requests", async () => {
    const body = { email: "ana@example.test", confirmation: true, ...botFields() };
    const response = await POST(request(body));

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(unsubscribeCommunityMemberMock).toHaveBeenCalledWith({
      email: "ana@example.test",
      confirmation: true,
    });
  });

  it("does not expose whether the email was previously subscribed", async () => {
    unsubscribeCommunityMemberMock.mockResolvedValue({ ok: true });

    const response = await POST(
      request({ email: "missing@example.test", confirmation: true, ...botFields() }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("returns validation errors without membership state", async () => {
    unsubscribeCommunityMemberMock.mockResolvedValue({
      ok: false,
      status: 400,
      errors: { email: "Ingresa un email válido." },
    });

    const response = await POST(request({ email: "bad", ...botFields() }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errors: { email: "Ingresa un email válido." },
    });
  });

  it("maps operational unsubscribe failures to a generic 500", async () => {
    unsubscribeCommunityMemberMock.mockResolvedValue({
      ok: false,
      status: 500,
      errors: { form: "No pudimos procesar la baja. Intenta nuevamente." },
    });

    const response = await POST(
      request({ email: "ana@example.test", confirmation: true, ...botFields() }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      errors: { form: "No pudimos procesar la baja. Intenta nuevamente." },
    });
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/community-members/unsubscribe", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects bot-like unsubscribe requests without exposing membership state", async () => {
    const response = await POST(
      request({
        email: "ana@example.test",
        confirmation: true,
        companyWebsite: "https://spam.test",
        submittedAt: String(Date.now() - 3000),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errors: { form: "No pudimos procesar la solicitud. Intenta nuevamente." },
    });
    expect(unsubscribeCommunityMemberMock).not.toHaveBeenCalled();
  });

  it("rate limits repeated unsubscribe attempts", async () => {
    process.env.RATE_LIMIT_COMMUNITY_MEMBERS_UNSUBSCRIBE_LIMIT = "1";
    process.env.RATE_LIMIT_COMMUNITY_MEMBERS_UNSUBSCRIBE_WINDOW_MS = "60000";
    const body = { email: "ana@example.test", confirmation: true, ...botFields() };

    expect((await POST(request(body, { "x-forwarded-for": "203.0.113.10" }))).status).toBe(200);

    const response = await POST(request(body, { "x-forwarded-for": "203.0.113.10" }));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      errors: { form: "Demasiadas solicitudes. Intenta nuevamente en unos minutos." },
    });
    expect(unsubscribeCommunityMemberMock).toHaveBeenCalledTimes(1);
  });
});
