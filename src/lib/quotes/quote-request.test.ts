import { describe, expect, it, vi } from "vitest";
import {
  createQuoteRequest,
  listRecentQuoteRequests,
  mapQuoteRequestToFirestore,
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
        }),
      },
    ];
    const get = vi.fn().mockResolvedValue({ docs });
    const limit = vi.fn().mockReturnValue({ get });
    const orderBy = vi.fn().mockReturnValue({ limit });
    const collection = vi.fn().mockReturnValue({ orderBy });

    await expect(listRecentQuoteRequests({ collection } as never, 5)).resolves.toEqual([
      expect.objectContaining({
        id: "quote-1",
        createdAt: "2026-06-18T10:00:00.000Z",
        customerName: "Ana Cliente",
        email: "ana@example.test",
        status: "pending",
        budgetClp: 100000,
      }),
    ]);
    expect(orderBy).toHaveBeenCalledWith("created_at", "desc");
    expect(limit).toHaveBeenCalledWith(5);
  });
});
