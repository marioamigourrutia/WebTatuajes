import { FieldValue } from "firebase-admin/firestore";

export const calendarDateStatuses = [
  "PENDING_CONFIRMATION",
  "DEPOSIT_PENDING",
  "DEPOSIT_VERIFIED",
  "CONFIRMED",
  "BLOCKED_BY_ADMIN",
  "CANCELLED",
  "RELEASED",
] as const;

export const activeCalendarDateStatuses = [
  "PENDING_CONFIRMATION",
  "DEPOSIT_PENDING",
  "DEPOSIT_VERIFIED",
  "CONFIRMED",
  "BLOCKED_BY_ADMIN",
] as const;

export type CalendarDateStatus = (typeof calendarDateStatuses)[number];
export type ActiveCalendarDateStatus = (typeof activeCalendarDateStatuses)[number];

export const pendingCalendarDateStatus = "PENDING_CONFIRMATION" satisfies CalendarDateStatus;

type FirestoreLike = {
  collection: (name: string) => {
    add?: (data: Record<string, unknown>) => Promise<{ id: string }>;
    where?: (
      field: string,
      operator: string,
      value: unknown,
    ) => {
      where: (
        field: string,
        operator: string,
        value: unknown,
      ) => {
        get: () => Promise<{ docs?: { id: string; data?: () => Record<string, unknown> }[] }>;
      };
    };
    doc: (id?: string) => {
      id: string;
      get?: () => Promise<{ exists: boolean; data?: () => Record<string, unknown> | undefined }>;
      delete?: () => Promise<unknown>;
    };
  };
  runTransaction: <T>(updateFunction: (transaction: unknown) => Promise<T>) => Promise<T>;
};

type TransactionLike = {
  get: (
    reference: unknown,
  ) => Promise<{ exists: boolean; data?: () => Record<string, unknown> | undefined }>;
  set: (
    reference: unknown,
    data: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => unknown;
  update?: (reference: unknown, data: Record<string, unknown>) => unknown;
};

type QuoteDocument = Record<string, unknown>;

export function isCalendarDateStatus(value: string): value is CalendarDateStatus {
  return calendarDateStatuses.includes(value as CalendarDateStatus);
}

export function isActiveCalendarDateStatus(value: unknown): value is ActiveCalendarDateStatus {
  return activeCalendarDateStatuses.includes(value as ActiveCalendarDateStatus);
}

export function buildCalendarDateDocumentId(localDate: string) {
  return localDate;
}

export type PublicCalendarDateStatus =
  | "AVAILABLE"
  | "PENDING_CONFIRMATION"
  | "RESERVED"
  | "UNAVAILABLE";

export type PublicCalendarDate = {
  date: string;
  status: PublicCalendarDateStatus;
};

export type AdminCalendarDateStatus =
  | "AVAILABLE"
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "BLOCKED_BY_ADMIN";

export type AdminCalendarDate = {
  date: string;
  status: AdminCalendarDateStatus;
};

export const maxPublicCalendarRangeDays = 62;

export function isValidLocalCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parts = value.split("-").map(Number);
  const [year, month, day] = parts;

  if (parts.length !== 3 || year === undefined || month === undefined || day === undefined) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function addUtcDays(localDate: string, days: number) {
  const [year = 0, month = 1, day = 1] = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));

  return date.toISOString().slice(0, 10);
}

export function getCalendarRangeDays(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T12:00:00.000Z`);
  const end = Date.parse(`${endDate}T12:00:00.000Z`);

  return Math.floor((end - start) / 86_400_000) + 1;
}

export function mapCalendarStatusToPublicStatus(status: unknown): PublicCalendarDateStatus {
  if (status === "PENDING_CONFIRMATION" || status === "DEPOSIT_PENDING") {
    return "PENDING_CONFIRMATION";
  }

  if (status === "DEPOSIT_VERIFIED" || status === "CONFIRMED") {
    return "RESERVED";
  }

  if (status === "BLOCKED_BY_ADMIN") {
    return "UNAVAILABLE";
  }

  return "AVAILABLE";
}

export function mapCalendarStatusToAdminStatus(status: unknown): AdminCalendarDateStatus {
  if (status === "PENDING_CONFIRMATION" || status === "DEPOSIT_PENDING") {
    return "PENDING_CONFIRMATION";
  }

  if (status === "DEPOSIT_VERIFIED" || status === "CONFIRMED") {
    return "CONFIRMED";
  }

  if (status === "BLOCKED_BY_ADMIN") {
    return "BLOCKED_BY_ADMIN";
  }

  return "AVAILABLE";
}

export function validatePublicCalendarRange(input: {
  start?: unknown;
  end?: unknown;
  month?: unknown;
}) {
  const month = typeof input.month === "string" ? input.month.trim() : "";
  let start = typeof input.start === "string" ? input.start.trim() : "";
  let end = typeof input.end === "string" ? input.end.trim() : "";

  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return { ok: false as const, status: 400, error: "Mes inválido." };
    }

    start = `${month}-01`;
    end = addUtcDays(
      `${month}-01`,
      new Date(`${month}-01T12:00:00.000Z`).getUTCMonth() === 11
        ? 30
        : new Date(
            Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0, 12),
          ).getUTCDate() - 1,
    );
  }

  if (!isValidLocalCalendarDate(start) || !isValidLocalCalendarDate(end)) {
    return { ok: false as const, status: 400, error: "Rango de fechas inválido." };
  }

  const days = getCalendarRangeDays(start, end);

  if (days < 1) {
    return {
      ok: false as const,
      status: 400,
      error: "La fecha final debe ser posterior a la inicial.",
    };
  }

  if (days > maxPublicCalendarRangeDays) {
    return {
      ok: false as const,
      status: 400,
      error: "El rango de calendario es demasiado amplio.",
    };
  }

  return { ok: true as const, start, end, days };
}

export async function listPublicCalendarAvailability(
  firestore: FirestoreLike,
  input: { start?: unknown; end?: unknown; month?: unknown },
) {
  const validation = validatePublicCalendarRange(input);

  if (!validation.ok) return validation;

  const calendarDates = firestore.collection("calendar_dates");

  if (!calendarDates.where) {
    return { ok: false as const, status: 503, error: "Calendario no disponible." };
  }

  const snapshot = await calendarDates
    .where("date", ">=", validation.start)
    .where("date", "<=", validation.end)
    .get();
  const statusByDate = new Map<string, PublicCalendarDateStatus>();

  for (const document of snapshot.docs ?? []) {
    const data = document.data?.() ?? {};
    const date =
      typeof data.date === "string" && isValidLocalCalendarDate(data.date)
        ? data.date
        : document.id;

    if (isValidLocalCalendarDate(date)) {
      statusByDate.set(date, mapCalendarStatusToPublicStatus(data.status));
    }
  }

  return {
    ok: true as const,
    dates: Array.from({ length: validation.days }, (_, index): PublicCalendarDate => {
      const date = addUtcDays(validation.start, index);
      return { date, status: statusByDate.get(date) ?? "AVAILABLE" };
    }),
  };
}

export async function listAdminCalendarMonth(firestore: FirestoreLike, input: { month?: unknown }) {
  const validation = validatePublicCalendarRange({ month: input.month });

  if (!validation.ok) return validation;

  const calendarDates = firestore.collection("calendar_dates");

  if (!calendarDates.where) {
    return { ok: false as const, status: 503, error: "Calendario no disponible." };
  }

  const snapshot = await calendarDates
    .where("date", ">=", validation.start)
    .where("date", "<=", validation.end)
    .get();
  const statusByDate = new Map<string, AdminCalendarDateStatus>();

  for (const document of snapshot.docs ?? []) {
    const data = document.data?.() ?? {};
    const date =
      typeof data.date === "string" && isValidLocalCalendarDate(data.date)
        ? data.date
        : document.id;

    if (isValidLocalCalendarDate(date)) {
      statusByDate.set(date, mapCalendarStatusToAdminStatus(data.status));
    }
  }

  return {
    ok: true as const,
    dates: Array.from({ length: validation.days }, (_, index): AdminCalendarDate => {
      const date = addUtcDays(validation.start, index);
      return { date, status: statusByDate.get(date) ?? "AVAILABLE" };
    }),
  };
}

export async function blockAdminCalendarDate(
  firestore: FirestoreLike,
  localDate: unknown,
  adminUid: unknown,
) {
  const date = typeof localDate === "string" ? localDate.trim() : "";
  const cleanAdminUid = typeof adminUid === "string" ? adminUid.trim() : "";

  if (!isValidLocalCalendarDate(date)) {
    return { ok: false as const, status: 400, error: "Fecha inválida." };
  }

  const reference = firestore.collection("calendar_dates").doc(buildCalendarDateDocumentId(date));

  return firestore.runTransaction(async (transaction) => {
    const transactionLike = transaction as TransactionLike;
    const snapshot = await transactionLike.get(reference);
    const data = snapshot.data?.() ?? {};

    if (
      snapshot.exists &&
      isActiveCalendarDateStatus(data.status) &&
      data.status !== "BLOCKED_BY_ADMIN"
    ) {
      return {
        ok: false as const,
        status: 409,
        error: "La fecha pertenece a una cotización o reserva y no se puede bloquear manualmente.",
      };
    }

    transactionLike.set(
      reference,
      {
        date,
        status: "BLOCKED_BY_ADMIN" satisfies CalendarDateStatus,
        source: "admin_block",
        blocked_by_admin_uid: cleanAdminUid || null,
        blocked_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true as const, date, calendarDateStatus: "BLOCKED_BY_ADMIN" as const };
  });
}

export async function unblockAdminCalendarDate(firestore: FirestoreLike, localDate: unknown) {
  const date = typeof localDate === "string" ? localDate.trim() : "";

  if (!isValidLocalCalendarDate(date)) {
    return { ok: false as const, status: 400, error: "Fecha inválida." };
  }

  const reference = firestore.collection("calendar_dates").doc(buildCalendarDateDocumentId(date));

  return firestore.runTransaction(async (transaction) => {
    const transactionLike = transaction as TransactionLike;
    const snapshot = await transactionLike.get(reference);
    const data = snapshot.data?.() ?? {};

    if (!snapshot.exists || data.status !== "BLOCKED_BY_ADMIN" || data.source !== "admin_block") {
      return {
        ok: false as const,
        status: 409,
        error: "Solo se pueden liberar fechas bloqueadas manualmente por admin.",
      };
    }

    transactionLike.set(
      reference,
      {
        ...data,
        status: "RELEASED" satisfies CalendarDateStatus,
        released_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true as const, date, calendarDateStatus: "RELEASED" as const };
  });
}

export async function bulkUpdateAdminCalendarDates(
  firestore: FirestoreLike,
  input: { action: unknown; dates: unknown; adminUid?: unknown },
) {
  const action = input.action === "block" || input.action === "unblock" ? input.action : null;
  const dates = Array.isArray(input.dates)
    ? [...new Set(input.dates.filter((date): date is string => typeof date === "string"))].slice(
        0,
        31,
      )
    : [];

  if (!action) {
    return { ok: false as const, status: 400, error: "Acción de calendario no permitida." };
  }

  if (dates.length === 0 || dates.some((date) => !isValidLocalCalendarDate(date))) {
    return { ok: false as const, status: 400, error: "Selecciona fechas válidas." };
  }

  const updated: string[] = [];
  const skipped: { date: string; error: string }[] = [];

  for (const date of dates) {
    const result =
      action === "block"
        ? await blockAdminCalendarDate(firestore, date, input.adminUid)
        : await unblockAdminCalendarDate(firestore, date);

    if (result.ok) {
      updated.push(result.date);
    } else {
      skipped.push({ date, error: result.error });
    }
  }

  return { ok: true as const, action, updated, skipped };
}

export function getDateUnavailableError() {
  return "La fecha solicitada ya no está disponible. Elige otro día para enviar tu cotización.";
}

export async function createQuoteWithOptionalDateReservation(
  firestore: FirestoreLike,
  quoteDocument: QuoteDocument,
  requestedDate: string | undefined,
) {
  const quoteReference = firestore.collection("quotes").doc();

  if (!requestedDate) {
    const quotes = firestore.collection("quotes");

    if (quotes.add) {
      const reference = await quotes.add(quoteDocument);
      return { quoteId: reference.id, calendarDateStatus: null };
    }

    await firestore.runTransaction(async (transaction) => {
      (transaction as TransactionLike).set(quoteReference, quoteDocument);
    });

    return { quoteId: quoteReference.id, calendarDateStatus: null };
  }

  const calendarDateReference = firestore
    .collection("calendar_dates")
    .doc(buildCalendarDateDocumentId(requestedDate));

  await firestore.runTransaction(async (transaction) => {
    const transactionLike = transaction as TransactionLike;
    const calendarDateSnapshot = await transactionLike.get(calendarDateReference);
    const existingStatus = calendarDateSnapshot.exists
      ? calendarDateSnapshot.data?.()?.status
      : undefined;

    if (isActiveCalendarDateStatus(existingStatus)) {
      throw new CalendarDateUnavailableError();
    }

    transactionLike.set(quoteReference, {
      ...quoteDocument,
      calendar_date_id: requestedDate,
      calendar_date_status: pendingCalendarDateStatus,
    });
    transactionLike.set(calendarDateReference, {
      date: requestedDate,
      status: pendingCalendarDateStatus,
      quote_id: quoteReference.id,
      quote_code: quoteDocument.quote_code ?? null,
      source: "public_quote_form",
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  return { quoteId: quoteReference.id, calendarDateStatus: pendingCalendarDateStatus };
}

export class CalendarDateUnavailableError extends Error {
  constructor() {
    super(getDateUnavailableError());
    this.name = "CalendarDateUnavailableError";
  }
}

export async function releasePendingCalendarDateForQuote(
  firestore: FirestoreLike,
  quoteId: string,
  requestedDate: string | undefined,
) {
  if (!requestedDate) {
    return;
  }

  const calendarDateReference = firestore
    .collection("calendar_dates")
    .doc(buildCalendarDateDocumentId(requestedDate));

  await firestore.runTransaction(async (transaction) => {
    const transactionLike = transaction as TransactionLike;
    const snapshot = await transactionLike.get(calendarDateReference);
    const data = snapshot.data?.() ?? {};

    if (snapshot.exists && data.quote_id === quoteId && data.status === pendingCalendarDateStatus) {
      transactionLike.set(calendarDateReference, {
        ...data,
        status: "RELEASED" satisfies CalendarDateStatus,
        released_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    }
  });
}
