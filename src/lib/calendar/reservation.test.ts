import { describe, expect, it, vi } from "vitest";
import {
  blockAdminCalendarDate,
  bulkUpdateAdminCalendarDates,
  listAdminCalendarMonth,
  mapCalendarStatusToAdminStatus,
  listPublicCalendarAvailability,
  mapCalendarStatusToPublicStatus,
  unblockAdminCalendarDate,
  validatePublicCalendarRange,
} from "./reservation";

function mockAvailabilityFirestore(docs: { id: string; data: Record<string, unknown> }[]) {
  const get = vi.fn().mockResolvedValue({
    docs: docs.map((document) => ({ id: document.id, data: () => document.data })),
  });
  const secondWhere = vi.fn(() => ({ get }));
  const firstWhere = vi.fn(() => ({ where: secondWhere }));
  const collection = vi.fn(() => ({ where: firstWhere, doc: vi.fn() }));

  return {
    firestore: { collection, runTransaction: vi.fn() },
    collection,
    firstWhere,
    secondWhere,
    get,
  };
}

function mockAdminCalendarFirestore(existingData: Record<string, unknown> | null) {
  const references = new Map<string, Record<string, unknown> | null>([
    ["calendar_dates/2026-07-15", existingData],
    ["quotes/quote-1", { calendar_date_status: existingData?.status ?? null }],
  ]);
  const set = vi.fn();
  const update = vi.fn();
  const collection = vi.fn((collectionName: string) => ({
    doc: vi.fn((id = "") => ({ id, path: `${collectionName}/${id}` })),
  }));
  const runTransaction = vi.fn(async (callback) =>
    callback({
      get: vi.fn(async (reference: { path: string }) => {
        const data = references.get(reference.path) ?? null;
        return { exists: data !== null, data: () => data ?? {} };
      }),
      set,
      update,
    }),
  );

  return { firestore: { collection, runTransaction }, set, update };
}

describe("calendar availability", () => {
  it("maps calendar records to sanitized public statuses only", async () => {
    const { firestore } = mockAvailabilityFirestore([
      {
        id: "2026-07-15",
        data: {
          date: "2026-07-15",
          status: "PENDING_CONFIRMATION",
          quote_id: "quote-1",
          customer_email: "private@test",
        },
      },
      {
        id: "2026-07-16",
        data: { date: "2026-07-16", status: "CONFIRMED", tattoo_details: "private" },
      },
      { id: "2026-07-17", data: { date: "2026-07-17", status: "BLOCKED_BY_ADMIN" } },
    ]);

    const result = await listPublicCalendarAvailability(firestore, {
      start: "2026-07-15",
      end: "2026-07-18",
    });

    expect(result).toEqual({
      ok: true,
      dates: [
        { date: "2026-07-15", status: "PENDING_CONFIRMATION" },
        { date: "2026-07-16", status: "OCCUPIED" },
        { date: "2026-07-17", status: "OCCUPIED" },
        { date: "2026-07-18", status: "AVAILABLE" },
      ],
    });
  });

  it("validates and caps public calendar ranges", () => {
    expect(validatePublicCalendarRange({ start: "2026-07-01", end: "2026-09-30" })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(validatePublicCalendarRange({ month: "2026-07" })).toMatchObject({
      ok: true,
      start: "2026-07-01",
      end: "2026-07-31",
    });
  });

  it("keeps public labels coarse", () => {
    expect(mapCalendarStatusToPublicStatus("DEPOSIT_VERIFIED")).toBe("OCCUPIED");
    expect(mapCalendarStatusToPublicStatus("CONFIRMED")).toBe("OCCUPIED");
    expect(mapCalendarStatusToPublicStatus("BLOCKED_BY_ADMIN")).toBe("OCCUPIED");
    expect(mapCalendarStatusToPublicStatus("RELEASED")).toBe("AVAILABLE");
    expect(mapCalendarStatusToPublicStatus("CANCELLED")).toBe("AVAILABLE");
  });

  it("lists admin month statuses without exposing calendar PII", async () => {
    const { firestore } = mockAvailabilityFirestore([
      {
        id: "2026-07-15",
        data: { date: "2026-07-15", status: "PENDING_CONFIRMATION", customer_email: "p@test" },
      },
      { id: "2026-07-16", data: { date: "2026-07-16", status: "CONFIRMED" } },
      { id: "2026-07-17", data: { date: "2026-07-17", status: "BLOCKED_BY_ADMIN" } },
    ]);

    await expect(listAdminCalendarMonth(firestore, { month: "2026-07" })).resolves.toMatchObject({
      ok: true,
      dates: expect.arrayContaining([
        { date: "2026-07-15", status: "PENDING_CONFIRMATION" },
        { date: "2026-07-16", status: "OCCUPIED" },
        { date: "2026-07-17", status: "OCCUPIED" },
      ]),
    });
  });

  it("maps admin calendar statuses to operational labels only", () => {
    expect(mapCalendarStatusToAdminStatus("DEPOSIT_PENDING")).toBe("PENDING_CONFIRMATION");
    expect(mapCalendarStatusToAdminStatus("DEPOSIT_VERIFIED")).toBe("OCCUPIED");
    expect(mapCalendarStatusToAdminStatus("CONFIRMED")).toBe("OCCUPIED");
    expect(mapCalendarStatusToAdminStatus("BLOCKED_BY_ADMIN")).toBe("OCCUPIED");
    expect(mapCalendarStatusToAdminStatus("RELEASED")).toBe("AVAILABLE");
  });
});

describe("admin calendar blocks", () => {
  it("does not overwrite quote-owned active dates when blocking", async () => {
    const { firestore, set } = mockAdminCalendarFirestore({
      date: "2026-07-15",
      status: "PENDING_CONFIRMATION",
      quote_id: "quote-1",
    });

    await expect(blockAdminCalendarDate(firestore, "2026-07-15", "admin-1")).resolves.toMatchObject(
      {
        ok: false,
        status: 409,
      },
    );
    expect(set).not.toHaveBeenCalled();
  });

  it("unblocks admin-owned blocked dates", async () => {
    const adminOwned = mockAdminCalendarFirestore({
      date: "2026-07-15",
      status: "BLOCKED_BY_ADMIN",
      source: "admin_block",
    });
    await expect(
      unblockAdminCalendarDate(adminOwned.firestore, "2026-07-15"),
    ).resolves.toMatchObject({
      ok: true,
      calendarDateStatus: "RELEASED",
    });
    expect(adminOwned.set).toHaveBeenCalledWith(
      expect.objectContaining({ path: "calendar_dates/2026-07-15" }),
      expect.objectContaining({ status: "RELEASED" }),
      { merge: true },
    );
  });

  it("unblocks quote-owned active dates and releases the quote calendar status", async () => {
    const quoteOwned = mockAdminCalendarFirestore({
      date: "2026-07-15",
      status: "CONFIRMED",
      source: "public_quote_form",
      quote_id: "quote-1",
    });

    await expect(
      unblockAdminCalendarDate(quoteOwned.firestore, "2026-07-15"),
    ).resolves.toMatchObject({
      ok: true,
      calendarDateStatus: "RELEASED",
    });
    expect(quoteOwned.update).toHaveBeenCalledWith(
      expect.objectContaining({ path: "quotes/quote-1" }),
      expect.objectContaining({ calendar_date_status: "RELEASED" }),
    );
  });

  it("bulk blocks available dates and skips quote-owned dates", async () => {
    const references = new Map<string, Record<string, unknown> | null>([
      ["2026-07-15", null],
      ["2026-07-16", { date: "2026-07-16", status: "PENDING_CONFIRMATION", quote_id: "q1" }],
    ]);
    const set = vi.fn();
    const collection = vi.fn(() => ({ doc: vi.fn((id = "") => ({ id })) }));
    const runTransaction = vi.fn(async (callback) =>
      callback({
        get: vi.fn(async (reference: { id: string }) => ({
          exists: references.get(reference.id) !== null,
          data: () => references.get(reference.id) ?? {},
        })),
        set,
      }),
    );

    await expect(
      bulkUpdateAdminCalendarDates({ collection, runTransaction } as never, {
        action: "block",
        dates: ["2026-07-15", "2026-07-16"],
        adminUid: "admin-1",
      }),
    ).resolves.toMatchObject({
      ok: true,
      updated: ["2026-07-15"],
      skipped: [{ date: "2026-07-16", error: expect.any(String) }],
    });
  });
});
