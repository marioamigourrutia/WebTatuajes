import { describe, expect, it, vi } from "vitest";
import { getRoleFromServerProfile, getServerAuthzProfileFromIdToken } from "./server";

describe("server auth helpers", () => {
  it("accepts roles only from server-side profile data", () => {
    expect(getRoleFromServerProfile({ role: "customer" })).toBe("customer");
    expect(getRoleFromServerProfile({ role: "artist" })).toBe("artist");
    expect(getRoleFromServerProfile({ role: "admin" })).toBe("admin");
    expect(getRoleFromServerProfile({ role: "owner" })).toBeNull();
    expect(getRoleFromServerProfile(null)).toBeNull();
  });

  it("does not infer privileged roles from token claims", async () => {
    const auth = {
      verifyIdToken: vi.fn().mockResolvedValue({
        uid: "customer-a",
        email: "customer@example.com",
        email_verified: true,
        role: "admin",
      }),
    };

    await expect(
      getServerAuthzProfileFromIdToken("token", {
        auth,
        readProfile: vi.fn().mockResolvedValue({ role: "customer" }),
      }),
    ).resolves.toMatchObject({ uid: "customer-a", role: "customer", emailVerified: true });
  });

  it("returns null when token, admin auth, or server profile role is unavailable", async () => {
    await expect(getServerAuthzProfileFromIdToken("", { auth: null })).resolves.toBeNull();
    await expect(getServerAuthzProfileFromIdToken("token", { auth: null })).resolves.toBeNull();
    await expect(
      getServerAuthzProfileFromIdToken("token", {
        auth: { verifyIdToken: vi.fn().mockResolvedValue({ uid: "u1" }) },
        readProfile: vi.fn().mockResolvedValue({ role: "owner" }),
      }),
    ).resolves.toBeNull();
  });
});
