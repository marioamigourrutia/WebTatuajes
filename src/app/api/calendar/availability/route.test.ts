import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listPublicCalendarAvailability } from "@/lib/calendar/reservation";

vi.mock("@/lib/firebase/admin", () => ({
  getFirebaseAdminFirestore: vi.fn(),
}));

vi.mock("@/lib/calendar/reservation", () => ({
  listPublicCalendarAvailability: vi.fn(),
}));

const getFirebaseAdminFirestoreMock = vi.mocked(getFirebaseAdminFirestore);
const listPublicCalendarAvailabilityMock = vi.mocked(listPublicCalendarAvailability);

describe("public calendar availability route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    listPublicCalendarAvailabilityMock.mockResolvedValue({
      ok: true,
      dates: [
        { date: "2026-07-15", status: "PENDING_CONFIRMATION" },
        { date: "2026-07-16", status: "AVAILABLE" },
      ],
    });
  });

  it("returns only public date availability fields", async () => {
    const response = await GET(
      new Request("http://localhost/api/calendar/availability?month=2026-07"),
    );

    await expect(response.json()).resolves.toEqual({
      dates: [
        { date: "2026-07-15", status: "PENDING_CONFIRMATION" },
        { date: "2026-07-16", status: "AVAILABLE" },
      ],
    });
    expect(listPublicCalendarAvailabilityMock).toHaveBeenCalledWith(expect.anything(), {
      month: "2026-07",
      start: undefined,
      end: undefined,
    });
  });

  it("returns validation errors without leaking internals", async () => {
    listPublicCalendarAvailabilityMock.mockResolvedValue({
      ok: false,
      status: 400,
      error: "Rango de fechas inválido.",
    });

    const response = await GET(
      new Request("http://localhost/api/calendar/availability?start=nope"),
    );

    await expect(response.json()).resolves.toEqual({ error: "Rango de fechas inválido." });
    expect(response.status).toBe(400);
  });
});
