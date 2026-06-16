import { describe, expect, it } from "vitest";
import { canAccessStaffArea, isAppRole } from "./roles";

describe("auth role helpers", () => {
  it("accepts only known application roles", () => {
    expect(isAppRole("customer")).toBe(true);
    expect(isAppRole("artist")).toBe(true);
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("owner")).toBe(false);
    expect(isAppRole(null)).toBe(false);
  });

  it("requires a verified staff role for staff area access", () => {
    expect(canAccessStaffArea(null)).toBe(false);
    expect(canAccessStaffArea({ uid: "u1", role: "customer", emailVerified: true })).toBe(false);
    expect(canAccessStaffArea({ uid: "u2", role: "artist", emailVerified: false })).toBe(false);
    expect(canAccessStaffArea({ uid: "u3", role: "artist", emailVerified: true })).toBe(true);
    expect(canAccessStaffArea({ uid: "u4", role: "admin", emailVerified: true })).toBe(true);
  });
});
