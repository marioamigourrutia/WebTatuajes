import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { unsubscribeCommunityMember } from "@/lib/community/member";

vi.mock("@/lib/community/member", () => ({
  unsubscribeCommunityMember: vi.fn(),
}));

const unsubscribeCommunityMemberMock = vi.mocked(unsubscribeCommunityMember);

function request(body: unknown) {
  return new Request("http://localhost/api/community-members/unsubscribe", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function botFields() {
  return { companyWebsite: "", submittedAt: String(Date.now() - 3000) };
}

describe("community member unsubscribe route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
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
});
