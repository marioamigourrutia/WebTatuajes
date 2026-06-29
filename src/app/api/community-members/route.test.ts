import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { createCommunityMember } from "@/lib/community/member";

vi.mock("@/lib/community/member", () => ({
  createCommunityMember: vi.fn(),
}));

const createCommunityMemberMock = vi.mocked(createCommunityMember);

function request(body: unknown) {
  return new Request("http://localhost/api/community-members", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function botFields() {
  return { companyWebsite: "", submittedAt: String(Date.now() - 3000) };
}

describe("community members route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createCommunityMemberMock.mockResolvedValue({
      ok: true,
    });
  });

  it("is public and creates a community member without auth headers", async () => {
    const body = {
      fullName: "Ana",
      email: "ana@example.test",
      marketingConsent: true,
      ...botFields(),
    };
    const response = await POST(request(body));

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(200);
    expect(createCommunityMemberMock).toHaveBeenCalledWith({
      fullName: "Ana",
      email: "ana@example.test",
      marketingConsent: true,
    });
  });

  it("returns a generic 200 response without exposing duplicate membership state", async () => {
    createCommunityMemberMock.mockResolvedValue({
      ok: true,
    });

    const response = await POST(
      request({ fullName: "Ana", email: "ana@example.test", ...botFields() }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("returns validation errors from the request helper", async () => {
    createCommunityMemberMock.mockResolvedValue({
      ok: false,
      status: 400,
      errors: { marketingConsent: "Debes aceptar recibir novedades de la comunidad." },
    });

    const response = await POST(request(botFields()));

    await expect(response.json()).resolves.toEqual({
      errors: { marketingConsent: "Debes aceptar recibir novedades de la comunidad." },
    });
    expect(response.status).toBe(400);
  });

  it("rejects invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/community-members", { method: "POST", body: "{" }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects bot-like submissions before creating a member", async () => {
    const response = await POST(
      request({
        fullName: "Ana",
        email: "ana@example.test",
        marketingConsent: true,
        companyWebsite: "https://spam.test",
        submittedAt: String(Date.now() - 3000),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      errors: { form: "No pudimos procesar la solicitud. Intenta nuevamente." },
    });
    expect(createCommunityMemberMock).not.toHaveBeenCalled();
  });
});
