import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuoteRequestForm } from "./quote-request-form";

function mockCalendarFetchWithQuoteResponse(quoteResponse: Record<string, unknown>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    const url = String(input);
    if (url.startsWith("/api/calendar/availability")) {
      return { ok: true, json: async () => ({ dates: [] }) };
    }
    if (url === "/api/quotes") {
      return { ok: true, json: async () => quoteResponse };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

function fillRequiredQuoteFields(container: HTMLElement) {
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="customerName"]')!, {
    target: { value: "Ana" },
  });
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="email"]')!, {
    target: { value: "ana@example.test" },
  });
  fireEvent.change(container.querySelector<HTMLTextAreaElement>('textarea[name="description"]')!, {
    target: { value: "Flores nativas en línea fina" },
  });
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="bodyPlacement"]')!, {
    target: { value: "Antebrazo" },
  });
  fireEvent.change(container.querySelector<HTMLInputElement>('input[name="approximateSize"]')!, {
    target: { value: "10 cm" },
  });
  fireEvent.click(container.querySelector<HTMLInputElement>('input[name="dataProcessingConsent"]')!);
  fireEvent.click(container.querySelector<HTMLInputElement>('input[name="imageHandlingConsent"]')!);
  fireEvent.click(container.querySelector<HTMLInputElement>('input[name="privacyTermsConsent"]')!);
}

describe("QuoteRequestForm public quote flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("open", vi.fn());
  });

  it("does not render Firebase email verification controls", () => {
    vi.stubGlobal("fetch", mockCalendarFetchWithQuoteResponse({}));

    render(<QuoteRequestForm />);

    expect(screen.queryByRole("button", { name: "Verificar email" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Usar otro email" })).not.toBeInTheDocument();
  });

  it("posts public quote data without an Authorization header and opens WhatsApp", async () => {
    const fetchMock = mockCalendarFetchWithQuoteResponse({
      quoteCode: "COT-2026-ABCDE",
      whatsappMessage: "Hola, código COT-2026-ABCDE",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<QuoteRequestForm />);
    fillRequiredQuoteFields(container);

    fireEvent.click(screen.getByRole("button", { name: "Enviar solicitud" }));

    expect(await screen.findByText("Solicitud recibida correctamente.")).toBeInTheDocument();
    const quoteCall = fetchMock.mock.calls.find(([input]) => String(input) === "/api/quotes");
    expect(quoteCall?.[1]).toMatchObject({ method: "POST" });
    expect((quoteCall?.[1] as RequestInit).headers).toBeUndefined();
    expect(globalThis.open).toHaveBeenCalledWith(
      expect.stringContaining("https://wa.me/"),
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("removes reference URL and image inputs from the public form", async () => {
    vi.stubGlobal("fetch", mockCalendarFetchWithQuoteResponse({}));

    const { container } = render(<QuoteRequestForm fileUploadsEnabled />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container.querySelector('[name="referenceUrls"]')).toBeNull();
    expect(container.querySelector('[name="referenceImages"]')).toBeNull();
    expect(screen.getByText(/Las referencias, fotos o enlaces/)).toBeInTheDocument();
  });
});
