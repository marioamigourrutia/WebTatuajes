import { describe, expect, it, vi } from "vitest";
import {
  createQuoteRequest,
  createQuoteRequestFromFormData,
  createQuoteRequestWithReferenceImages,
  getAdminQuoteReferenceImageFile,
  listRecentQuoteRequests,
  mapQuoteRequestToFirestore,
  quoteStatuses,
  referenceImageConstraints,
  updateQuoteRequestInternalNote,
  updateQuoteRequestStatus,
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
};

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
      });
    }
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
      expect(mapQuoteRequestToFirestore(validation.value)).toEqual({
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
        source: "public_quote_form",
      });
    }
  });
});

describe("quote request firestore helpers", () => {
  it("creates quotes through the injected server Firestore dependency", async () => {
    const add = vi.fn().mockResolvedValue({ id: "quote-123" });
    const collection = vi.fn().mockReturnValue({ add });

    await expect(createQuoteRequest(validInput, { collection } as never)).resolves.toEqual({
      ok: true,
      id: "quote-123",
    });
    expect(collection).toHaveBeenCalledWith("quotes");
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_name: "Ana Cliente",
        customer_email: "ana@example.test",
        status: "pending",
        source: "public_quote_form",
      }),
    );
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
    const collection = vi.fn((name: string) => {
      if (name === "quotes") return { add: addQuote };
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
        { collection } as never,
        { file } as never,
      ),
    ).resolves.toEqual({ ok: true, id: "quote-123" });

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
    const deleteImage = vi.fn().mockResolvedValue(undefined);
    const addImage = vi
      .fn()
      .mockResolvedValueOnce({ id: "image-1", delete: deleteImage })
      .mockRejectedValueOnce(new Error("metadata failed"));
    const collection = vi.fn((name: string) => {
      if (name === "quotes") return { add: addQuote };
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
        { collection } as never,
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

    await expect(listRecentQuoteRequests({ collection } as never, 5)).resolves.toEqual([
      expect.objectContaining({
        id: "quote-1",
        createdAt: "2026-06-18T10:00:00.000Z",
        customerName: "Ana Cliente",
        email: "ana@example.test",
        status: "pending",
        description: "Una descripción suficientemente larga".repeat(10),
        descriptionPreview: expect.stringContaining("Una descripción"),
        budgetClp: 100000,
        internalNote: "Enviar referencias de líneas finas.",
        referenceImages: [
          expect.objectContaining({
            id: "image-1",
            accessUrl: "/api/admin/quotes/images?imageId=image-1",
            originalFilename: "reference.png",
            storagePath: "quote-images/anonymous/quote-1/reference.png",
          }),
        ],
      }),
    ]);
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

  it("updates quote status through the injected server Firestore dependency", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const get = vi.fn().mockResolvedValue({ exists: true });
    const doc = vi.fn().mockReturnValue({ get, update });
    const collection = vi.fn().mockReturnValue({ doc });

    await expect(
      updateQuoteRequestStatus({ collection } as never, " quote-1 ", "contacted"),
    ).resolves.toEqual({ ok: true, quoteId: "quote-1", quoteStatus: "contacted" });

    expect(collection).toHaveBeenCalledWith("quotes");
    expect(doc).toHaveBeenCalledWith("quote-1");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "contacted",
        updated_at: expect.anything(),
      }),
    );
  });

  it("rejects invalid quote status values before writing", async () => {
    const update = vi.fn();
    const doc = vi.fn().mockReturnValue({ get: vi.fn(), update });
    const collection = vi.fn().mockReturnValue({ doc });

    await expect(
      updateQuoteRequestStatus({ collection } as never, "quote-1", "approved"),
    ).resolves.toMatchObject({ ok: false, status: 400 });
    expect(quoteStatuses).toEqual(["pending", "contacted", "closed", "spam"]);
    expect(doc).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects malformed quote IDs before reading Firestore", async () => {
    const update = vi.fn();
    const doc = vi.fn().mockReturnValue({ get: vi.fn(), update });
    const collection = vi.fn().mockReturnValue({ doc });

    await expect(
      updateQuoteRequestStatus({ collection } as never, "../../profiles/admin", "contacted"),
    ).resolves.toEqual({ ok: false, status: 400, error: "ID de solicitud inválido." });

    expect(collection).not.toHaveBeenCalled();
    expect(doc).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not update a missing quote", async () => {
    const update = vi.fn();
    const get = vi.fn().mockResolvedValue({ exists: false });
    const doc = vi.fn().mockReturnValue({ get, update });
    const collection = vi.fn().mockReturnValue({ doc });

    await expect(
      updateQuoteRequestStatus({ collection } as never, "quote-404", "closed"),
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
