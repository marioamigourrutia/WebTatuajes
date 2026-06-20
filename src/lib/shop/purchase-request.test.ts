import { describe, expect, it, vi } from "vitest";
import {
  createPurchaseRequest,
  isPurchaseRequestStatus,
  listRecentPurchaseRequests,
  mapPurchaseRequestToFirestore,
  purchaseRequestStatusLabels,
  updatePurchaseRequestStatus,
  validatePurchaseRequestInput,
} from "./purchase-request";

const validInput = {
  productId: "flash-peonia-linea-fina",
  customerName: "  Ana Cliente  ",
  phone: " +56 9 1234 5678 ",
  email: " ANA@EXAMPLE.TEST ",
  contactConsent: "on",
};

function mockPurchaseRequestsCollection(add = vi.fn().mockResolvedValue({ id: "purchase-123" })) {
  return {
    add,
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
      }),
    }),
  };
}

describe("purchase request validation", () => {
  it("sanitizes and accepts an available product request", () => {
    const result = validatePurchaseRequestInput(validInput);

    expect(result).toMatchObject({
      ok: true,
      value: {
        productId: "flash-peonia-linea-fina",
        customerName: "Ana Cliente",
        phone: "+56 9 1234 5678",
        email: "ana@example.test",
        contactConsent: true,
      },
      product: { code: "OBR-001" },
    });
  });

  it.each([
    ["+56 9 1234 5678", "+56 9 1234 5678"],
    ["(+56) 2 2345-6789", "(+56) 2 2345-6789"],
    ["  9 1234 5678  ", "9 1234 5678"],
  ])("accepts Chile-style purchase phone %s", (phone, expectedPhone) => {
    const result = validatePurchaseRequestInput({ ...validInput, phone });

    expect(result).toMatchObject({ ok: true, value: { phone: expectedPhone } });
  });

  it.each(["abc", "+56 9 abc 5678", "+56 9 1234.5678", "1234567"])(
    "rejects invalid purchase phone %s",
    (phone) => {
      const result = validatePurchaseRequestInput({ ...validInput, phone });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.phone).toEqual(expect.any(String));
      }
    },
  );

  it("rejects unavailable products, invalid email, and missing consent", () => {
    const result = validatePurchaseRequestInput({
      productId: "flash-serpiente-blackwork",
      customerName: "",
      phone: "",
      email: "not-an-email",
      contactConsent: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toMatchObject({
        productId: expect.any(String),
        customerName: expect.any(String),
        phone: expect.any(String),
        email: expect.any(String),
        contactConsent: expect.any(String),
      });
    }
  });

  it("maps a valid request to Firestore snake_case fields", () => {
    const validation = validatePurchaseRequestInput(validInput);

    expect(validation.ok).toBe(true);
    if (validation.ok) {
      expect(
        mapPurchaseRequestToFirestore(validation.value, validation.product, "COM-2026-ABCDE"),
      ).toMatchObject({
        purchase_code: "COM-2026-ABCDE",
        customer_name: "Ana Cliente",
        customer_email: "ana@example.test",
        product_code: "OBR-001",
        status: "pending",
        source: "public_shop_form",
      });
    }
  });

  it("defines dynamic admin purchase statuses with Chilean Spanish labels", () => {
    expect(isPurchaseRequestStatus("reserved")).toBe(true);
    expect(isPurchaseRequestStatus("paid")).toBe(false);
    expect(purchaseRequestStatusLabels).toMatchObject({
      pending: "Pendiente",
      contacted: "Contactado",
      reserved: "Reservado",
      sold: "Vendido",
      discarded: "Descartado",
    });
  });
});

describe("purchase request persistence", () => {
  it("creates a Firestore purchase request and returns a code plus WhatsApp URL", async () => {
    const add = vi.fn().mockResolvedValue({ id: "purchase-123" });
    const purchaseRequests = mockPurchaseRequestsCollection(add);
    const firestore = {
      collection: vi.fn((name: string) => {
        if (name === "purchase_requests") return purchaseRequests;
        throw new Error(`Unexpected collection ${name}`);
      }),
    };

    const result = await createPurchaseRequest(validInput, firestore as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.purchaseCode).toMatch(/^COM-\d{4}-[A-F0-9]{5}$/);
      expect(result.whatsappUrl).toContain("https://wa.me/");
    }
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ product_code: "OBR-001" }));
  });

  it("returns a clear backend error when Firebase Admin is unavailable", async () => {
    const result = await createPurchaseRequest(validInput, null);

    expect(result).toEqual({
      ok: false,
      status: 503,
      errors: { form: "Firebase Admin no está configurado para guardar solicitudes." },
    });
  });

  it("serializes recent purchase requests for the admin panel", async () => {
    const firestore = {
      collection: vi.fn(() => ({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({
              docs: [
                {
                  id: "purchase-1",
                  data: () => ({
                    purchase_code: "COM-2026-ABCDE",
                    customer_name: "Ana Cliente",
                    customer_phone: "+56 9 1234 5678",
                    product_code: "OBR-001",
                    product_title: "Peonía en línea fina",
                    product_price_clp: 85000,
                    status: "pending",
                  }),
                },
              ],
            }),
          }),
        }),
      })),
    };

    await expect(listRecentPurchaseRequests(firestore as never)).resolves.toEqual([
      expect.objectContaining({
        id: "purchase-1",
        purchaseCode: "COM-2026-ABCDE",
        productCode: "OBR-001",
        whatsappUrl: expect.stringContaining("https://wa.me/"),
      }),
    ]);
  });

  it("updates purchase request status after validating id and status", async () => {
    const update = vi.fn();
    const firestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ status: "contacted" }) }),
          update,
        })),
      })),
    };

    await expect(
      updatePurchaseRequestStatus(firestore as never, "purchase-1", "reserved"),
    ).resolves.toMatchObject({ ok: true, purchaseRequestId: "purchase-1", status: "reserved" });
    expect(update).toHaveBeenCalledWith({ status: "reserved", updated_at: expect.anything() });
  });

  it("rejects unsafe purchase request status transitions", async () => {
    const firestore = { collection: vi.fn() };

    await expect(
      updatePurchaseRequestStatus(firestore as never, "purchase-1", "paid"),
    ).resolves.toMatchObject({ ok: false, status: 400 });
  });

  it.each([
    ["sold", "pending"],
    ["discarded", "reserved"],
    ["pending", "sold"],
  ])("rejects invalid transition from %s to %s", async (currentStatus, targetStatus) => {
    const update = vi.fn();
    const firestore = {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ status: currentStatus }) }),
          update,
        })),
      })),
    };

    await expect(
      updatePurchaseRequestStatus(firestore as never, "purchase-1", targetStatus),
    ).resolves.toMatchObject({
      ok: false,
      status: 400,
      error: "Transición de estado de compra inválida.",
    });
    expect(update).not.toHaveBeenCalled();
  });

  it.each(["pending", "contacted", "discarded"])(
    "allows safe legacy initial status %s when current status is missing",
    async (targetStatus) => {
      const update = vi.fn();
      const firestore = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
            update,
          })),
        })),
      };

      await expect(
        updatePurchaseRequestStatus(firestore as never, "purchase-1", targetStatus),
      ).resolves.toMatchObject({ ok: true, status: targetStatus });
    },
  );

  it.each([
    [undefined, "reserved"],
    [undefined, "sold"],
    ["unknown", "reserved"],
    ["unknown", "sold"],
  ])(
    "rejects legacy current status %s jumping directly to %s",
    async (currentStatus, targetStatus) => {
      const update = vi.fn();
      const firestore = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => (currentStatus === undefined ? {} : { status: currentStatus }),
            }),
            update,
          })),
        })),
      };

      await expect(
        updatePurchaseRequestStatus(firestore as never, "purchase-1", targetStatus),
      ).resolves.toMatchObject({
        ok: false,
        status: 400,
        error: "Transición de estado de compra inválida.",
      });
      expect(update).not.toHaveBeenCalled();
    },
  );
});
