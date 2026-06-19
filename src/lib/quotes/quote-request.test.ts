import { describe, expect, it, vi } from "vitest";
import { activeCalendarDateStatuses, calendarDateStatuses } from "../calendar/reservation";
import {
  clientQuoteStatusLookupError,
  confirmQuoteReservation,
  createQuoteRequest,
  createQuoteRequestFromFormData,
  createQuoteRequestWithReferenceImages,
  getAdminQuoteReferenceImageFile,
  getClientQuoteStatusByCode,
  listRecentQuoteRequests,
  mapQuoteRequestToFirestore,
  quoteStatuses,
  recordQuoteDeposit,
  referenceImageConstraints,
  serializeClientQuoteStatus,
  updateQuoteRequestInternalNote,
  updateQuoteRequestStatus,
  validateQuoteDepositInput,
  validateQuoteInternalNoteInput,
  validateQuoteReferenceImages,
  validateQuoteRequestInput,
} from "./quote-request";

const validInput = {
  customerName: "  Ana Cliente  ",
  email: "ANA@EXAMPLE.TEST",
  phone: "+56 9 1234 5678",
  description: "Quiero un tatuaje floral en línea fina.",
  bodyPlacement: "Antebrazo",
  approximateSize: "10 cm",
  budgetClp: "80000",
  preferredContactMethod: "whatsapp",
  preferredTattooDate: "2026-07-15",
  dataProcessingConsent: "on",
  imageHandlingConsent: "on",
  privacyTermsConsent: "on",
  marketingOptIn: "on",
};

function mockQuotesCollection(add = vi.fn().mockResolvedValue({ id: "quote-123" })) {
  return {
    add,
    doc: vi.fn().mockReturnValue({ id: "quote-123", delete: vi.fn().mockResolvedValue(undefined) }),
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
      }),
    }),
  };
}

function mockTransactionalFirestore(existingCalendarStatus?: string) {
  const quoteReference = { id: "quote-123", delete: vi.fn().mockResolvedValue(undefined) };
  const calendarDateReference = { id: "2026-07-15" };
  const set = vi.fn();
  const get = vi
    .fn()
    .mockResolvedValue(
      existingCalendarStatus
        ? { exists: true, data: () => ({ status: existingCalendarStatus }) }
        : { exists: false, data: () => ({}) },
    );
  const add = vi.fn().mockResolvedValue(quoteReference);
  const where = vi.fn().mockReturnValue({
    limit: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    }),
  });
  const doc = vi.fn((id?: string) => (id ? calendarDateReference : quoteReference));
  const collection = vi.fn((name: string) => {
    if (name === "quotes") return { add, doc, where };
    if (name === "calendar_dates") return { doc };
    if (name === "quote_images") return { add };
    throw new Error(`Unexpected collection ${name}`);
  });
  const runTransaction = vi.fn(async (callback) => callback({ get, set }));

  return {
    firestore: { collection, runTransaction },
    quoteReference,
    add,
    collection,
    get,
    set,
    doc,
  };
}

function mockStatusTransitionFirestore({
  quoteExists = true,
  quoteData = {},
  calendarData,
}: {
  quoteExists?: boolean;
  quoteData?: Record<string, unknown>;
  calendarData?: Record<string, unknown> | null;
} = {}) {
  const quoteReference = { id: "quote-1" };
  const calendarDateReference = { id: "2026-07-15" };
  const update = vi.fn();
  const set = vi.fn();
  const get = vi
    .fn()
    .mockResolvedValueOnce({ exists: quoteExists, data: () => quoteData })
    .mockResolvedValueOnce({
      exists: calendarData !== null && calendarData !== undefined,
      data: () => calendarData ?? {},
    });
  const doc = vi.fn((id: string) => (id === "quote-1" ? quoteReference : calendarDateReference));
  const collection = vi.fn((name: string) => {
    if (name === "quotes") return { doc };
    if (name === "calendar_dates") return { doc };
    throw new Error(`Unexpected collection ${name}`);
  });
  const runTransaction = vi.fn(async (callback) => callback({ get, update, set }));

  return { firestore: { collection, runTransaction }, collection, doc, get, update, set };
}

function mockReservationConfirmationFirestore({
  quoteExists = true,
  quoteData = {},
  calendarData,
}: {
  quoteExists?: boolean;
  quoteData?: Record<string, unknown>;
  calendarData?: Record<string, unknown> | null;
} = {}) {
  const quoteReference = { id: "quote-1" };
  const calendarDateReference = { id: "2026-07-15" };
  const update = vi.fn();
  const set = vi.fn();
  const get = vi
    .fn()
    .mockResolvedValueOnce({ exists: quoteExists, data: () => quoteData })
    .mockResolvedValueOnce({
      exists: calendarData !== null && calendarData !== undefined,
      data: () => calendarData ?? {},
    });
  const doc = vi.fn((id: string) => (id === "quote-1" ? quoteReference : calendarDateReference));
  const collection = vi.fn((name: string) => {
    if (name === "quotes") return { doc };
    if (name === "calendar_dates") return { doc };
    throw new Error(`Unexpected collection ${name}`);
  });
  const runTransaction = vi.fn(async (callback) => callback({ get, update, set }));

  return { firestore: { collection, runTransaction }, collection, doc, get, update, set };
}

describe("quote request validation", () => {
  it("sanitizes and accepts a complete quote request", () => {
    const result = validateQuoteRequestInput(validInput);

    expect(result).toEqual({
      ok: true,
      value: {
        customerName: "Ana Cliente",
        email: "ana@example.test",
        phone: "+56 9 1234 5678",
        description: "Quiero un tatuaje floral en línea fina.",
        bodyPlacement: "Antebrazo",
        approximateSize: "10 cm",
        budgetClp: 80000,
        preferredContactMethod: "whatsapp",
        preferredTattooDate: "2026-07-15",
        consents: {
          dataProcessing: true,
          imageHandling: true,
          privacyTerms: true,
          marketingOptIn: true,
        },
      },
    });
  });

  it("rejects missing required fields, bad email, bad budget, and invalid contact method", () => {
    const result = validateQuoteRequestInput({
      customerName: "",
      email: "not-an-email",
      description: "",
      bodyPlacement: "",
      approximateSize: "",
      budgetClp: "abc",
      preferredContactMethod: "telegram",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        customerName: expect.any(String),
        email: expect.any(String),
        description: expect.any(String),
        bodyPlacement: expect.any(String),
        approximateSize: expect.any(String),
        budgetClp: expect.any(String),
        preferredContactMethod: expect.any(String),
        dataProcessingConsent: expect.any(String),
        imageHandlingConsent: expect.any(String),
        privacyTermsConsent: expect.any(String),
      });
    }
  });

  it("rejects malformed preferred dates and missing required consents", () => {
    const result = validateQuoteRequestInput({
      ...validInput,
      preferredTattooDate: "2026-02-31",
      dataProcessingConsent: undefined,
      imageHandlingConsent: undefined,
      privacyTermsConsent: undefined,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        preferredTattooDate: expect.any(String),
        dataProcessingConsent: expect.any(String),
        imageHandlingConsent: expect.any(String),
        privacyTermsConsent: expect.any(String),
      });
    }
  });

  it("validates manual quote deposit input", () => {
    expect(
      validateQuoteDepositInput({
        amountClp: "50000",
        method: " transferencia ",
        paidAt: "2026-07-10",
        reference: " OP-123 ",
        internalNote: "  Validado por cartola.  ",
      }),
    ).toEqual({
      ok: true,
      value: {
        amountClp: 50000,
        method: "transferencia",
        paidAt: "2026-07-10",
        reference: "OP-123",
        internalNote: "Validado por cartola.",
      },
    });
  });

  it("rejects signed, decimal, formatted, and unsafe manual deposit amounts", () => {
    const invalidAmounts = ["-5000", "+5000", "1.5", "50.000", "5 000", 1.5, -5000, 0, 2 ** 53];

    invalidAmounts.forEach((amountClp) => {
      const result = validateQuoteDepositInput({
        amountClp,
        method: "transferencia",
        paidAt: "2026-07-10",
      });

      expect(result).toEqual({
        ok: false,
        status: 400,
        errors: { amountClp: "El abono debe ser un monto positivo en CLP." },
      });
    });
  });

  it("rejects invalid manual deposit amount and date", () => {
    expect(validateQuoteDepositInput({ amountClp: "0", method: "", paidAt: "2026-02-31" })).toEqual(
      {
        ok: false,
        status: 400,
        errors: {
          amountClp: "El abono debe ser un monto positivo en CLP.",
          method: "Indica el método de pago del abono.",
          paidAt: "Ingresa una fecha de pago válida.",
        },
      },
    );
  });

  it("validates optional reference image constraints", () => {
    const validFile = new File(["image"], "reference.png", { type: "image/png" });
    const invalidFile = new File(["text"], "reference.txt", { type: "text/plain" });
    const oversizedFile = new File(
      [new Uint8Array(referenceImageConstraints.maxSizeBytes + 1)],
      "big.png",
      { type: "image/png" },
    );

    expect(validateQuoteReferenceImages([validFile])).toEqual({
      ok: true,
      value: [
        {
          file: validFile,
          originalFilename: "reference.png",
          mimeType: "image/png",
          sizeBytes: validFile.size,
        },
      ],
    });
    expect(validateQuoteReferenceImages([invalidFile])).toMatchObject({
      ok: false,
      errors: { "referenceImages.0": expect.any(String) },
    });
    expect(validateQuoteReferenceImages([oversizedFile])).toMatchObject({
      ok: false,
      errors: { "referenceImages.0": expect.any(String) },
    });
    expect(
      validateQuoteReferenceImages([validFile, validFile, validFile, validFile]),
    ).toMatchObject({
      ok: false,
      errors: { referenceImages: expect.any(String) },
    });
  });

  it("maps validated input to a focused Firestore quote document", () => {
    const validation = validateQuoteRequestInput(validInput);

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(mapQuoteRequestToFirestore(validation.value, "COT-2026-ABCDE")).toEqual({
        quote_code: "COT-2026-ABCDE",
        customer_id: "anonymous",
        customer_name: "Ana Cliente",
        customer_email: "ana@example.test",
        customer_phone: "+56 9 1234 5678",
        preferred_contact_method: "whatsapp",
        status: "pending",
        body_area: "Antebrazo",
        size_description: "10 cm",
        description: "Quiero un tatuaje floral en línea fina.",
        budget_clp: 80000,
        preferred_tattoo_date: "2026-07-15",
        consents: {
          data_processing: true,
          image_handling: true,
          privacy_terms: true,
          marketing_opt_in: true,
        },
        consent_recorded_at: expect.anything(),
        source: "public_quote_form",
      });
    }
  });
});

describe("client quote status serialization", () => {
  it("exposes only safe client status fields", () => {
    const result = serializeClientQuoteStatus("quote-1", {
      quote_code: "COT-2026-ABCDE",
      preferred_tattoo_date: "2026-07-15",
      status: "contacted",
      calendar_date_status: "CONFIRMED",
      client_visible_message: "Tu reserva está lista.",
      admin_note: "Nota privada",
      customer_email: "cliente@example.test",
      storage_path: "quote-images/private/path.png",
      deposit: {
        amount_clp: 50000,
        method: "transferencia",
        paid_at: "2026-07-01",
        reference: "secret-ref",
        internal_note: "privado",
        verified: true,
      },
    });

    expect(result).toEqual({
      quoteCode: "COT-2026-ABCDE",
      preferredTattooDate: "2026-07-15",
      status: "contacted",
      calendarDateStatus: "CONFIRMED",
      deposit: { amountClp: 50000, paidAt: "2026-07-01", verified: true },
      publicMessage: "Tu reserva está lista.",
    });
    expect(JSON.stringify(result)).not.toContain("cliente@example.test");
    expect(JSON.stringify(result)).not.toContain("storage_path");
    expect(JSON.stringify(result)).not.toContain("Nota privada");
    expect(JSON.stringify(result)).not.toContain("secret-ref");
  });
});

describe("client quote status lookup", () => {
  function mockStatusLookupFirestore(data?: Record<string, unknown>) {
    const docs = data ? [{ id: "quote-1", data: () => data }] : [];
    const get = vi.fn().mockResolvedValue({ docs });
    const limit = vi.fn().mockReturnValue({ get });
    const where = vi.fn().mockReturnValue({ limit });
    const collection = vi.fn().mockReturnValue({ where });

    return { firestore: { collection }, collection, where, limit, get };
  }

  it("returns status when quote code and normalized client email match", async () => {
    const { firestore } = mockStatusLookupFirestore({
      quote_code: "COT-2026-ABCDE",
      customer_email: "ana@example.test",
      preferred_tattoo_date: "2026-07-15",
      status: "pending",
      calendar_date_status: "PENDING_CONFIRMATION",
    });

    await expect(
      getClientQuoteStatusByCode(firestore as never, " cot-2026-abcde ", " ANA@EXAMPLE.TEST "),
    ).resolves.toMatchObject({
      ok: true,
      quote: {
        quoteCode: "COT-2026-ABCDE",
        preferredTattooDate: "2026-07-15",
        status: "pending",
        calendarDateStatus: "PENDING_CONFIRMATION",
      },
    });
  });

  it("denies code-only status lookup", async () => {
    const { firestore, collection } = mockStatusLookupFirestore({
      quote_code: "COT-2026-ABCDE",
      customer_email: "ana@example.test",
    });

    await expect(
      getClientQuoteStatusByCode(firestore as never, "COT-2026-ABCDE", ""),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: clientQuoteStatusLookupError,
    });
    expect(collection).not.toHaveBeenCalled();
  });

  it("denies wrong email with the same generic error", async () => {
    const { firestore } = mockStatusLookupFirestore({
      quote_code: "COT-2026-ABCDE",
      customer_email: "ana@example.test",
    });

    await expect(
      getClientQuoteStatusByCode(firestore as never, "COT-2026-ABCDE", "otra@example.test"),
    ).resolves.toEqual({
      ok: false,
      status: 404,
      error: clientQuoteStatusLookupError,
    });
  });

  it("uses one generic error for invalid code and email combinations", async () => {
    const { firestore } = mockStatusLookupFirestore();

    await expect(
      getClientQuoteStatusByCode(firestore as never, "bad-code", "bad-email"),
    ).resolves.toEqual({
      ok: false,
      status: 400,
      error: clientQuoteStatusLookupError,
    });
    await expect(
      getClientQuoteStatusByCode(firestore as never, "COT-2026-ABCDE", "missing@example.test"),
    ).resolves.toEqual({
      ok: false,
      status: 404,
      error: clientQuoteStatusLookupError,
    });
  });

  it("does not expose private fields in the client status response", async () => {
    const { firestore } = mockStatusLookupFirestore({
      quote_code: "COT-2026-ABCDE",
      customer_email: "ana@example.test",
      admin_note: "Nota privada",
      storage_path: "quote-images/private/path.png",
      reference_token: "secret-token",
      status: "contacted",
      deposit: {
        amount_clp: 50000,
        method: "transferencia",
        paid_at: "2026-07-01",
        reference: "secret-ref",
        internal_note: "privado",
        verified: true,
      },
    });

    const result = await getClientQuoteStatusByCode(
      firestore as never,
      "COT-2026-ABCDE",
      "ana@example.test",
    );

    expect(result.ok).toBe(true);
    expect(JSON.stringify(result)).not.toContain("ana@example.test");
    expect(JSON.stringify(result)).not.toContain("Nota privada");
    expect(JSON.stringify(result)).not.toContain("quote-images/private/path.png");
    expect(JSON.stringify(result)).not.toContain("secret-token");
    expect(JSON.stringify(result)).not.toContain("secret-ref");
  });
});

describe("quote request firestore helpers", () => {
  it("creates quotes through the injected server Firestore dependency", async () => {
    const { firestore, collection, get, set, doc } = mockTransactionalFirestore();

    await expect(createQuoteRequest(validInput, firestore as never)).resolves.toMatchObject({
      ok: true,
      id: "quote-123",
      quoteCode: expect.stringMatching(/^COT-\d{4}-[A-F0-9]{5}$/),
    });
    expect(collection).toHaveBeenCalledWith("quotes");
    expect(collection).toHaveBeenCalledWith("calendar_dates");
    expect(doc).toHaveBeenCalledWith("2026-07-15");
    expect(get).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ id: "quote-123" }),
      expect.objectContaining({
        customer_name: "Ana Cliente",
        customer_email: "ana@example.test",
        quote_code: expect.stringMatching(/^COT-\d{4}-[A-F0-9]{5}$/),
        status: "pending",
        preferred_tattoo_date: "2026-07-15",
        calendar_date_id: "2026-07-15",
        calendar_date_status: "PENDING_CONFIRMATION",
        source: "public_quote_form",
      }),
    );
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ id: "2026-07-15" }),
      expect.objectContaining({
        date: "2026-07-15",
        status: "PENDING_CONFIRMATION",
        quote_id: "quote-123",
        quote_code: expect.stringMatching(/^COT-\d{4}-[A-F0-9]{5}$/),
      }),
    );
  });

  it("rejects duplicate active quote requests for the same preferred date", async () => {
    const { firestore, set } = mockTransactionalFirestore("CONFIRMED");

    await expect(createQuoteRequest(validInput, firestore as never)).resolves.toEqual({
      ok: false,
      status: 409,
      errors: {
        preferredTattooDate:
          "La fecha solicitada ya no está disponible. Elige otro día para enviar tu cotización.",
      },
    });
    expect(set).not.toHaveBeenCalled();
  });

  it("creates a quote without blocking a calendar date when no preferred date is provided", async () => {
    const { firestore, add, set } = mockTransactionalFirestore();

    await expect(
      createQuoteRequest({ ...validInput, preferredTattooDate: "" }, firestore as never),
    ).resolves.toMatchObject({ ok: true, id: "quote-123" });

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ preferred_tattoo_date: null }));
    expect(add.mock.calls[0]?.[0]).not.toHaveProperty("calendar_date_status");
    expect(set).not.toHaveBeenCalled();
  });

  it("defines the calendar date status model and active write-blocking statuses", () => {
    expect(calendarDateStatuses).toEqual([
      "PENDING_CONFIRMATION",
      "DEPOSIT_PENDING",
      "DEPOSIT_VERIFIED",
      "CONFIRMED",
      "BLOCKED_BY_ADMIN",
      "CANCELLED",
      "RELEASED",
    ]);
    expect(activeCalendarDateStatuses).toEqual([
      "PENDING_CONFIRMATION",
      "DEPOSIT_PENDING",
      "DEPOSIT_VERIFIED",
      "CONFIRMED",
      "BLOCKED_BY_ADMIN",
    ]);
  });

  it("does not write malformed quote requests", async () => {
    const add = vi.fn();
    const collection = vi.fn().mockReturnValue({ add });

    const result = await createQuoteRequest({ email: "bad" }, { collection } as never);

    expect(result.ok).toBe(false);
    expect(add).not.toHaveBeenCalled();
  });

  it("uploads reference images and writes image metadata server-side", async () => {
    const addQuote = vi.fn().mockResolvedValue({ id: "quote-123", delete: vi.fn() });
    const addImage = vi.fn().mockResolvedValue({ id: "image-123" });
    const quoteReference = { id: "quote-123", delete: vi.fn() };
    const doc = vi.fn((id?: string) => ({ id: id ?? "quote-123", delete: quoteReference.delete }));
    const runTransaction = vi.fn(async (callback) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
        set: vi.fn(),
      }),
    );
    const collection = vi.fn((name: string) => {
      if (name === "quotes") return { ...mockQuotesCollection(addQuote), doc };
      if (name === "calendar_dates") return { doc };
      if (name === "quote_images") return { add: addImage };
      throw new Error(`Unexpected collection ${name}`);
    });
    const save = vi.fn().mockResolvedValue(undefined);
    const file = vi.fn().mockReturnValue({ save, delete: vi.fn() });
    const imageFile = new File(["image"], "flower.png", { type: "image/png" });

    await expect(
      createQuoteRequestWithReferenceImages(
        validInput,
        [
          {
            file: imageFile,
            originalFilename: "flower.png",
            mimeType: "image/png",
            sizeBytes: imageFile.size,
          },
        ],
        { collection, runTransaction } as never,
        { file } as never,
      ),
    ).resolves.toMatchObject({ ok: true, id: "quote-123", quoteCode: expect.any(String) });

    expect(file).toHaveBeenCalledWith(
      expect.stringMatching(/^quote-images\/anonymous\/quote-123\//),
    );
    expect(save).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/png" }),
    );
    expect(addImage).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: "anonymous",
        quote_id: "quote-123",
        original_filename: "flower.png",
        mime_type: "image/png",
        size_bytes: imageFile.size,
      }),
    );
  });

  it("cleans up uploaded files, image metadata, and quote when an image operation fails", async () => {
    const deleteQuote = vi.fn().mockResolvedValue(undefined);
    const addQuote = vi.fn().mockResolvedValue({ id: "quote-123", delete: deleteQuote });
    const doc = vi.fn((id?: string) => ({ id: id ?? "quote-123", delete: deleteQuote }));
    const transactionGet = vi
      .fn()
      .mockResolvedValueOnce({ exists: false, data: () => ({}) })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ quote_id: "quote-123", status: "PENDING_CONFIRMATION" }),
      });
    const runTransaction = vi.fn(async (callback) =>
      callback({ get: transactionGet, set: vi.fn() }),
    );
    const deleteImage = vi.fn().mockResolvedValue(undefined);
    const addImage = vi
      .fn()
      .mockResolvedValueOnce({ id: "image-1", delete: deleteImage })
      .mockRejectedValueOnce(new Error("metadata failed"));
    const collection = vi.fn((name: string) => {
      if (name === "quotes") return { ...mockQuotesCollection(addQuote), doc };
      if (name === "calendar_dates") return { doc };
      if (name === "quote_images") return { add: addImage };
      throw new Error(`Unexpected collection ${name}`);
    });
    const deleteFile = vi.fn().mockResolvedValue(undefined);
    const save = vi.fn().mockResolvedValue(undefined);
    const file = vi.fn().mockReturnValue({ save, delete: deleteFile });
    const imageFile = new File(["image"], "flower.png", { type: "image/png" });

    await expect(
      createQuoteRequestWithReferenceImages(
        validInput,
        [
          {
            file: imageFile,
            originalFilename: "flower.png",
            mimeType: "image/png",
            sizeBytes: imageFile.size,
          },
          {
            file: imageFile,
            originalFilename: "second.png",
            mimeType: "image/png",
            sizeBytes: imageFile.size,
          },
        ],
        { collection, runTransaction } as never,
        { file } as never,
      ),
    ).rejects.toThrow("metadata failed");

    expect(deleteFile).toHaveBeenCalledTimes(2);
    expect(deleteImage).toHaveBeenCalledTimes(1);
    expect(deleteQuote).toHaveBeenCalledTimes(1);
  });

  it("rejects multipart route input with invalid reference images before writing", async () => {
    const formData = new FormData();
    Object.entries(validInput).forEach(([key, value]) => formData.set(key, String(value)));
    formData.append("referenceImages", new File(["text"], "reference.txt", { type: "text/plain" }));
    const collection = vi.fn();

    await expect(
      createQuoteRequestFromFormData(formData, { collection } as never, null),
    ).resolves.toMatchObject({
      ok: false,
      status: 400,
      errors: { "referenceImages.0": expect.any(String) },
    });
    expect(collection).not.toHaveBeenCalled();
  });

  it("serializes recent quote documents for the admin list", async () => {
    const docs = [
      {
        id: "quote-1",
        data: () => ({
          created_at: new Date("2026-06-18T10:00:00.000Z"),
          customer_name: "Ana Cliente",
          customer_email: "ana@example.test",
          customer_phone: "+56 9",
          preferred_contact_method: "email",
          status: "pending",
          body_area: "Brazo",
          size_description: "10 cm",
          description: "Una descripción suficientemente larga".repeat(10),
          budget_clp: 100000,
          admin_note: "Enviar referencias de líneas finas.",
          quote_code: "COT-2026-ABCDE",
          preferred_tattoo_date: "2026-07-15",
          calendar_date_status: "PENDING_CONFIRMATION",
          deposit: {
            amount_clp: 50000,
            method: "transferencia",
            paid_at: "2026-07-10",
            reference: "OP-123",
            internal_note: "Cartola privada",
            verified: true,
            verified_at: new Date("2026-07-10T15:00:00.000Z"),
          },
          consents: {
            data_processing: true,
            image_handling: true,
            privacy_terms: true,
            marketing_opt_in: false,
          },
        }),
      },
    ];
    const getQuotes = vi.fn().mockResolvedValue({ docs });
    const limit = vi.fn().mockReturnValue({ get: getQuotes });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const getImages = vi.fn().mockResolvedValue({
      docs: [
        {
          id: "image-1",
          data: () => ({
            storage_path: "quote-images/anonymous/quote-1/reference.png",
            original_filename: "reference.png",
            mime_type: "image/png",
            size_bytes: 128,
          }),
        },
      ],
    });
    const where = vi.fn().mockReturnValue({ get: getImages });
    const collection = vi.fn((name: string) => {
      if (name === "quotes") return { orderBy };
      if (name === "quote_images") return { where };
      throw new Error(`Unexpected collection ${name}`);
    });

    const result = await listRecentQuoteRequests({ collection } as never, 5);

    expect(result).toEqual([
      expect.objectContaining({
        id: "quote-1",
        quoteCode: "COT-2026-ABCDE",
        createdAt: "2026-06-18T10:00:00.000Z",
        customerName: "Ana Cliente",
        email: "ana@example.test",
        status: "pending",
        description: "Una descripción suficientemente larga".repeat(10),
        descriptionPreview: expect.stringContaining("Una descripción"),
        budgetClp: 100000,
        preferredTattooDate: "2026-07-15",
        calendarDateStatus: "PENDING_CONFIRMATION",
        consents: {
          dataProcessing: true,
          imageHandling: true,
          privacyTerms: true,
          marketingOptIn: false,
        },
        internalNote: "Enviar referencias de líneas finas.",
        deposit: {
          amountClp: 50000,
          method: "transferencia",
          paidAt: "2026-07-10",
          reference: "OP-123",
          verified: true,
          verifiedAt: "2026-07-10T15:00:00.000Z",
        },
        referenceImages: [
          {
            id: "image-1",
            accessUrl: "/api/admin/quotes/images?imageId=image-1",
            originalFilename: "reference.png",
            mimeType: "image/png",
            sizeBytes: 128,
          },
        ],
      }),
    ]);
    expect(JSON.stringify(result)).not.toContain("quote-images/anonymous/quote-1/reference.png");
    expect(JSON.stringify(result)).not.toContain("Cartola privada");
    expect(orderBy).toHaveBeenCalledWith("created_at", "desc");
    expect(limit).toHaveBeenCalledWith(5);
    expect(where).toHaveBeenCalledWith("quote_id", "==", "quote-1");
  });

  it("validates image IDs before reading quote image metadata", async () => {
    const doc = vi.fn();
    const collection = vi.fn().mockReturnValue({ doc });

    await expect(
      getAdminQuoteReferenceImageFile({ collection } as never, "../../bad"),
    ).resolves.toEqual({ ok: false, status: 400, error: "ID de imagen inválido." });

    expect(collection).not.toHaveBeenCalled();
    expect(doc).not.toHaveBeenCalled();
  });

  it("reads private quote image metadata for the admin proxy", async () => {
    const get = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        quote_id: "quote-123",
        storage_path: "quote-images/anonymous/quote-123/reference.png",
        original_filename: "reference.png",
        mime_type: "image/png",
      }),
    });
    const doc = vi.fn().mockReturnValue({ get });
    const collection = vi.fn().mockReturnValue({ doc });

    await expect(
      getAdminQuoteReferenceImageFile({ collection } as never, "image-123", "quote-123"),
    ).resolves.toEqual({
      ok: true,
      file: {
        storagePath: "quote-images/anonymous/quote-123/reference.png",
        originalFilename: "reference.png",
        mimeType: "image/png",
      },
    });
    expect(collection).toHaveBeenCalledWith("quote_images");
    expect(doc).toHaveBeenCalledWith("image-123");
  });

  it("rejects image metadata with an unsafe storage path", async () => {
    const get = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        quote_id: "quote-123",
        storage_path: "public/reference.png",
        original_filename: "reference.png",
        mime_type: "image/png",
      }),
    });
    const doc = vi.fn().mockReturnValue({ get });
    const collection = vi.fn().mockReturnValue({ doc });

    await expect(
      getAdminQuoteReferenceImageFile({ collection } as never, "image-123", "quote-123"),
    ).resolves.toEqual({ ok: false, status: 422, error: "La metadata de imagen es inválida." });
  });

  it("updates quote status through one server-side Firestore transaction", async () => {
    const { firestore, collection, doc, update } = mockStatusTransitionFirestore({
      quoteData: { calendar_date_status: "PENDING_CONFIRMATION" },
    });

    await expect(
      updateQuoteRequestStatus(firestore as never, " quote-1 ", "contacted"),
    ).resolves.toEqual({
      ok: true,
      quoteId: "quote-1",
      quoteStatus: "contacted",
      calendarDateStatus: "PENDING_CONFIRMATION",
    });

    expect(collection).toHaveBeenCalledWith("quotes");
    expect(doc).toHaveBeenCalledWith("quote-1");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "quote-1" }),
      expect.objectContaining({
        status: "contacted",
        updated_at: expect.anything(),
      }),
    );
  });

  it("releases a pending calendar date when a quote is marked spam", async () => {
    const { firestore, set, update } = mockStatusTransitionFirestore({
      quoteData: {
        quote_code: "COT-2026-ABCDE",
        calendar_date_id: "2026-07-15",
        calendar_date_status: "PENDING_CONFIRMATION",
      },
      calendarData: {
        date: "2026-07-15",
        status: "PENDING_CONFIRMATION",
        quote_id: "quote-1",
        quote_code: "COT-2026-ABCDE",
      },
    });

    await expect(updateQuoteRequestStatus(firestore as never, "quote-1", "spam")).resolves.toEqual({
      ok: true,
      quoteId: "quote-1",
      quoteStatus: "spam",
      calendarDateStatus: "RELEASED",
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ id: "2026-07-15" }),
      expect.objectContaining({
        date: "2026-07-15",
        status: "RELEASED",
        quote_id: "quote-1",
        released_at: expect.anything(),
        updated_at: expect.anything(),
      }),
      { merge: true },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "quote-1" }),
      expect.objectContaining({ status: "spam", calendar_date_status: "RELEASED" }),
    );
  });

  it("releases a pending calendar date when a quote is explicitly closed", async () => {
    const { firestore, set, update } = mockStatusTransitionFirestore({
      quoteData: {
        quote_code: "COT-2026-ABCDE",
        calendar_date_id: "2026-07-15",
        calendar_date_status: "PENDING_CONFIRMATION",
      },
      calendarData: {
        date: "2026-07-15",
        status: "PENDING_CONFIRMATION",
        quote_id: "quote-1",
        quote_code: "COT-2026-ABCDE",
      },
    });

    await expect(
      updateQuoteRequestStatus(firestore as never, "quote-1", "closed"),
    ).resolves.toEqual({
      ok: true,
      quoteId: "quote-1",
      quoteStatus: "closed",
      calendarDateStatus: "RELEASED",
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ id: "2026-07-15" }),
      expect.objectContaining({ status: "RELEASED", quote_id: "quote-1" }),
      { merge: true },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "quote-1" }),
      expect.objectContaining({ status: "closed", calendar_date_status: "RELEASED" }),
    );
  });

  it("does not release a pending calendar date when a quote is marked contacted", async () => {
    const { firestore, set, get } = mockStatusTransitionFirestore({
      quoteData: {
        calendar_date_id: "2026-07-15",
        calendar_date_status: "PENDING_CONFIRMATION",
      },
      calendarData: {
        date: "2026-07-15",
        status: "PENDING_CONFIRMATION",
        quote_id: "quote-1",
      },
    });

    await expect(
      updateQuoteRequestStatus(firestore as never, "quote-1", "contacted"),
    ).resolves.toEqual({
      ok: true,
      quoteId: "quote-1",
      quoteStatus: "contacted",
      calendarDateStatus: "PENDING_CONFIRMATION",
    });

    expect(get).toHaveBeenCalledTimes(1);
    expect(set).not.toHaveBeenCalled();
  });

  it("does not release a calendar date owned by another quote", async () => {
    const { firestore, set, update } = mockStatusTransitionFirestore({
      quoteData: {
        quote_code: "COT-2026-ABCDE",
        calendar_date_id: "2026-07-15",
        calendar_date_status: "PENDING_CONFIRMATION",
      },
      calendarData: {
        date: "2026-07-15",
        status: "PENDING_CONFIRMATION",
        quote_id: "quote-2",
        quote_code: "COT-2026-ZZZZZ",
      },
    });

    await expect(updateQuoteRequestStatus(firestore as never, "quote-1", "spam")).resolves.toEqual({
      ok: true,
      quoteId: "quote-1",
      quoteStatus: "spam",
      calendarDateStatus: "PENDING_CONFIRMATION",
    });

    expect(set).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "quote-1" }),
      expect.not.objectContaining({ calendar_date_status: "RELEASED" }),
    );
  });

  it("does not release a coded calendar date when the quote code is missing", async () => {
    const { firestore, set, update } = mockStatusTransitionFirestore({
      quoteData: {
        calendar_date_id: "2026-07-15",
        calendar_date_status: "PENDING_CONFIRMATION",
      },
      calendarData: {
        date: "2026-07-15",
        status: "PENDING_CONFIRMATION",
        quote_id: "quote-1",
        quote_code: "COT-2026-ABCDE",
      },
    });

    await expect(updateQuoteRequestStatus(firestore as never, "quote-1", "spam")).resolves.toEqual({
      ok: true,
      quoteId: "quote-1",
      quoteStatus: "spam",
      calendarDateStatus: "PENDING_CONFIRMATION",
    });

    expect(set).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "quote-1" }),
      expect.not.objectContaining({ calendar_date_status: "RELEASED" }),
    );
  });

  it("preserves non-pending calendar date status when closing a quote", async () => {
    const { firestore, set, update } = mockStatusTransitionFirestore({
      quoteData: {
        quote_code: "COT-2026-ABCDE",
        calendar_date_id: "2026-07-15",
        calendar_date_status: "DEPOSIT_PENDING",
      },
      calendarData: {
        date: "2026-07-15",
        status: "DEPOSIT_PENDING",
        quote_id: "quote-1",
        quote_code: "COT-2026-ABCDE",
      },
    });

    await expect(
      updateQuoteRequestStatus(firestore as never, "quote-1", "closed"),
    ).resolves.toEqual({
      ok: true,
      quoteId: "quote-1",
      quoteStatus: "closed",
      calendarDateStatus: "DEPOSIT_PENDING",
    });

    expect(set).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "quote-1" }),
      expect.not.objectContaining({ calendar_date_status: "RELEASED" }),
    );
  });

  it("records a verified manual deposit for a quote-owned pending date", async () => {
    const { firestore, update } = mockReservationConfirmationFirestore({
      quoteData: {
        quote_code: "COT-2026-ABCDE",
        calendar_date_id: "2026-07-15",
        calendar_date_status: "PENDING_CONFIRMATION",
      },
      calendarData: {
        date: "2026-07-15",
        status: "PENDING_CONFIRMATION",
        quote_id: "quote-1",
        quote_code: "COT-2026-ABCDE",
      },
    });

    await expect(
      recordQuoteDeposit(
        firestore as never,
        "quote-1",
        {
          amountClp: 50000,
          method: "transferencia",
          paidAt: "2026-07-10",
          reference: "OP-123",
          internalNote: "Validado contra cartola.",
        },
        "admin-1",
      ),
    ).resolves.toEqual({
      ok: true,
      quoteId: "quote-1",
      calendarDateStatus: "PENDING_CONFIRMATION",
      deposit: {
        amountClp: 50000,
        method: "transferencia",
        paidAt: "2026-07-10",
        reference: "OP-123",
        verified: true,
        verifiedAt: null,
      },
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "quote-1" }),
      expect.objectContaining({
        deposit: expect.objectContaining({
          amount_clp: 50000,
          method: "transferencia",
          paid_at: "2026-07-10",
          reference: "OP-123",
          internal_note: "Validado contra cartola.",
          calendar_date_id: "2026-07-15",
          verified: true,
          verified_by_admin_uid: "admin-1",
          verified_at: expect.anything(),
        }),
        updated_at: expect.anything(),
      }),
    );
  });

  it("confirms a pending reservation after a verified deposit", async () => {
    const { firestore, set, update } = mockReservationConfirmationFirestore({
      quoteData: {
        quote_code: "COT-2026-ABCDE",
        calendar_date_id: "2026-07-15",
        calendar_date_status: "PENDING_CONFIRMATION",
        deposit: { verified: true, calendar_date_id: "2026-07-15" },
      },
      calendarData: {
        date: "2026-07-15",
        status: "PENDING_CONFIRMATION",
        quote_id: "quote-1",
        quote_code: "COT-2026-ABCDE",
      },
    });

    await expect(confirmQuoteReservation(firestore as never, "quote-1")).resolves.toEqual({
      ok: true,
      quoteId: "quote-1",
      calendarDateStatus: "CONFIRMED",
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ id: "2026-07-15" }),
      expect.objectContaining({
        date: "2026-07-15",
        status: "CONFIRMED",
        quote_id: "quote-1",
        confirmed_at: expect.anything(),
        updated_at: expect.anything(),
      }),
      { merge: true },
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "quote-1" }),
      expect.objectContaining({
        calendar_date_status: "CONFIRMED",
        reservation_confirmed_at: expect.anything(),
        updated_at: expect.anything(),
      }),
    );
  });

  it("does not confirm a reservation before deposit verification", async () => {
    const { firestore, set, update } = mockReservationConfirmationFirestore({
      quoteData: {
        quote_code: "COT-2026-ABCDE",
        calendar_date_id: "2026-07-15",
        calendar_date_status: "PENDING_CONFIRMATION",
      },
      calendarData: {
        date: "2026-07-15",
        status: "PENDING_CONFIRMATION",
        quote_id: "quote-1",
        quote_code: "COT-2026-ABCDE",
      },
    });

    await expect(confirmQuoteReservation(firestore as never, "quote-1")).resolves.toEqual({
      ok: false,
      status: 409,
      error: "No se puede confirmar la reserva sin un abono verificado para esta fecha.",
    });

    expect(set).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not confirm a calendar date owned by another quote", async () => {
    const { firestore, set, update } = mockReservationConfirmationFirestore({
      quoteData: {
        quote_code: "COT-2026-ABCDE",
        calendar_date_id: "2026-07-15",
        calendar_date_status: "PENDING_CONFIRMATION",
        deposit: { verified: true, calendar_date_id: "2026-07-15" },
      },
      calendarData: {
        date: "2026-07-15",
        status: "PENDING_CONFIRMATION",
        quote_id: "quote-2",
        quote_code: "COT-2026-ZZZZZ",
      },
    });

    await expect(confirmQuoteReservation(firestore as never, "quote-1")).resolves.toEqual({
      ok: false,
      status: 409,
      error: "La fecha ya no está pendiente o pertenece a otra cotización.",
    });

    expect(set).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects invalid quote status values before writing", async () => {
    const update = vi.fn();
    const doc = vi.fn();
    const collection = vi.fn().mockReturnValue({ doc });
    const runTransaction = vi.fn();

    await expect(
      updateQuoteRequestStatus({ collection, runTransaction } as never, "quote-1", "approved"),
    ).resolves.toMatchObject({ ok: false, status: 400 });
    expect(quoteStatuses).toEqual(["pending", "contacted", "closed", "spam"]);
    expect(doc).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects malformed quote IDs before reading Firestore", async () => {
    const update = vi.fn();
    const doc = vi.fn();
    const collection = vi.fn().mockReturnValue({ doc });
    const runTransaction = vi.fn();

    await expect(
      updateQuoteRequestStatus(
        { collection, runTransaction } as never,
        "../../profiles/admin",
        "contacted",
      ),
    ).resolves.toEqual({ ok: false, status: 400, error: "ID de solicitud inválido." });

    expect(collection).not.toHaveBeenCalled();
    expect(doc).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not update a missing quote", async () => {
    const { firestore, update } = mockStatusTransitionFirestore({ quoteExists: false });

    await expect(
      updateQuoteRequestStatus(firestore as never, "quote-404", "closed"),
    ).resolves.toMatchObject({ ok: false, status: 404 });
    expect(update).not.toHaveBeenCalled();
  });

  it("validates internal note payloads before writing", () => {
    expect(
      validateQuoteInternalNoteInput(" quote-1 ", "  Llamar mañana\r\ncon propuesta.  "),
    ).toEqual({
      ok: true,
      quoteId: "quote-1",
      internalNote: "Llamar mañana\ncon propuesta.",
    });
    expect(validateQuoteInternalNoteInput("../../profiles/admin", "nota")).toEqual({
      ok: false,
      status: 400,
      error: "ID de solicitud inválido.",
    });
    expect(validateQuoteInternalNoteInput("quote-1", "x".repeat(2001))).toEqual({
      ok: false,
      status: 400,
      error: "La nota interna es demasiado larga.",
    });
  });

  it("updates internal notes through the injected server Firestore dependency", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const get = vi.fn().mockResolvedValue({ exists: true });
    const doc = vi.fn().mockReturnValue({ get, update });
    const collection = vi.fn().mockReturnValue({ doc });

    await expect(
      updateQuoteRequestInternalNote({ collection } as never, "quote-1", " Nota privada "),
    ).resolves.toEqual({ ok: true, quoteId: "quote-1", internalNote: "Nota privada" });

    expect(collection).toHaveBeenCalledWith("quotes");
    expect(doc).toHaveBeenCalledWith("quote-1");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        admin_note: "Nota privada",
        updated_at: expect.anything(),
      }),
    );
  });

  it("rejects invalid internal note data before reading Firestore", async () => {
    const update = vi.fn();
    const doc = vi.fn().mockReturnValue({ get: vi.fn(), update });
    const collection = vi.fn().mockReturnValue({ doc });

    await expect(
      updateQuoteRequestInternalNote({ collection } as never, "quote-1", "x".repeat(2001)),
    ).resolves.toMatchObject({ ok: false, status: 400 });

    expect(collection).not.toHaveBeenCalled();
    expect(doc).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
