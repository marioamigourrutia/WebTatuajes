import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  blockAdminCalendarDate,
  bulkUpdateAdminCalendarDates,
  listAdminCalendarMonth,
  unblockAdminCalendarDate,
} from "@/lib/calendar/reservation";

vi.mock("@/lib/auth/bearer", () => ({ getBearerToken: vi.fn(() => "id-token") }));
vi.mock("@/lib/auth/server", () => ({ getServerAuthStatusFromIdToken: vi.fn() }));
vi.mock("@/lib/firebase/admin", () => ({ getFirebaseAdminFirestore: vi.fn() }));
vi.mock("@/lib/calendar/reservation", () => ({
  blockAdminCalendarDate: vi.fn(),
  bulkUpdateAdminCalendarDates: vi.fn(),
  listAdminCalendarMonth: vi.fn(),
  unblockAdminCalendarDate: vi.fn(),
}));

const getServerAuthStatusFromIdTokenMock = vi.mocked(getServerAuthStatusFromIdToken);
const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const blockAdminCalendarDateMock = vi.mocked(blockAdminCalendarDate);
const bulkUpdateAdminCalendarDatesMock = vi.mocked(bulkUpdateAdminCalendarDates);
const listAdminCalendarMonthMock = vi.mocked(listAdminCalendarMonth);
const unblockAdminCalendarDateMock = vi.mocked(unblockAdminCalendarDate);

function request(body: unknown) {
  return new Request("http://localhost/api/admin/calendar", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("admin calendar route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: true,
      profile: { uid: "admin-a", email: "admin@example.test", emailVerified: true, role: "admin" },
    });
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    blockAdminCalendarDateMock.mockResolvedValue({
      ok: true,
      date: "2026-07-15",
      calendarDateStatus: "BLOCKED_BY_ADMIN",
    });
    unblockAdminCalendarDateMock.mockResolvedValue({
      ok: true,
      date: "2026-07-15",
      calendarDateStatus: "RELEASED",
    });
    listAdminCalendarMonthMock.mockResolvedValue({
      ok: true,
      dates: [{ date: "2026-07-15", status: "OCCUPIED" }],
    });
    bulkUpdateAdminCalendarDatesMock.mockResolvedValue({
      ok: true,
      action: "block",
      updated: ["2026-07-15"],
      skipped: [],
    });
  });

  it("requires server-side admin role before blocking dates", async () => {
    const response = await POST(request({ action: "block", date: "2026-07-15" }));

    await expect(response.json()).resolves.toEqual({
      date: "2026-07-15",
      calendarDateStatus: "BLOCKED_BY_ADMIN",
    });
    expect(blockAdminCalendarDateMock).toHaveBeenCalledWith(
      expect.anything(),
      "2026-07-15",
      "admin-a",
    );
  });

  it("rejects non-admin users before calendar mutations", async () => {
    getServerAuthStatusFromIdTokenMock.mockResolvedValue({
      authenticated: true,
      admin: false,
      profile: { uid: "user-a", email: "user@example.test", emailVerified: true, role: "customer" },
    });

    const response = await POST(request({ action: "unblock", date: "2026-07-15" }));

    expect(response.status).toBe(403);
    expect(unblockAdminCalendarDateMock).not.toHaveBeenCalled();
  });

  it("lists admin month statuses without client PII", async () => {
    const response = await POST(request({ action: "list", month: "2026-07" }));

    await expect(response.json()).resolves.toEqual({
      dates: [{ date: "2026-07-15", status: "OCCUPIED" }],
    });
    expect(listAdminCalendarMonthMock).toHaveBeenCalledWith(expect.anything(), {
      month: "2026-07",
    });
  });

  it("supports bulk blocking through the admin route", async () => {
    const response = await POST(
      request({ action: "bulkBlock", dates: ["2026-07-15", "2026-07-16"] }),
    );

    await expect(response.json()).resolves.toEqual({ updated: ["2026-07-15"], skipped: [] });
    expect(bulkUpdateAdminCalendarDatesMock).toHaveBeenCalledWith(expect.anything(), {
      action: "block",
      dates: ["2026-07-15", "2026-07-16"],
      adminUid: "admin-a",
    });
  });
});
