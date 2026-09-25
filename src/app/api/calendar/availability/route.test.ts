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
    vi.restoreAllMocks();
    getFirebaseAdminFirestoreMock.mockReset();
    listPublicCalendarAvailabilityMock.mockReset();
    getFirebaseAdminFirestoreMock.mockReturnValue({ collection: vi.fn() } as never);
    listPublicCalendarAvailabilityMock.mockResolvedValue({
      ok: true,
      dates: [
        { date: "2026-07-15", status: "PENDING_CONFIRMATION" },
        { date: "2026-07-16", status: "OCCUPIED" },
        { date: "2026-07-17", status: "AVAILABLE" },
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
        { date: "2026-07-16", status: "OCCUPIED" },
        { date: "2026-07-17", status: "AVAILABLE" },
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

  it("reads production availability when a preview has no Firebase Admin backend", async () => {
    getFirebaseAdminFirestoreMock.mockReturnValue(null);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ dates: [{ date: "2026-09-18", status: "OCCUPIED" }] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const response = await GET(
      new Request(
        "https://webtatuajes-git-design-neoni.example.vercel.app/api/calendar/availability?month=2026-09",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      dates: [{ date: "2026-09-18", status: "OCCUPIED" }],
      source: "production-readonly",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(target)).toBe(
      "https://webtatuajes.vercel.app/api/calendar/availability?month=2026-09",
    );
    expect(options).toEqual(expect.objectContaining({ method: "GET", cache: "no-store" }));
  });

  it("never proxies the production calendar route back into itself", async () => {
    getFirebaseAdminFirestoreMock.mockReturnValue(null);
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const response = await GET(
      new Request("https://webtatuajes.vercel.app/api/calendar/availability?month=2026-09"),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toMatch(/backend/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
