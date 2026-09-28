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

function mockCalendarFetchWithDates(dates: Array<{ date: string; status: string }>) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    void init;
    const url = String(input);
    if (url.startsWith("/api/calendar/availability")) {
      return { ok: true, json: async () => ({ dates }) };
    }
    if (url === "/api/quotes") {
      return { ok: true, json: async () => ({}) };
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

function addMonths(month: string, offset: number) {
  const [year = new Date().getUTCFullYear(), monthNumber = 1] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1, 12));
  return date.toISOString().slice(0, 7);
}

function dateInMonth(month: string, day: number) {
  return `${month}-${String(day).padStart(2, "0")}`;
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
  fireEvent.click(
    container.querySelector<HTMLInputElement>('input[name="dataProcessingConsent"]')!,
  );
  fireEvent.click(container.querySelector<HTMLInputElement>('input[name="imageHandlingConsent"]')!);
  fireEvent.click(container.querySelector<HTMLInputElement>('input[name="privacyTermsConsent"]')!);
}

describe("QuoteRequestForm public quote flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("open", vi.fn());
  });

  it("does not render Firebase email verification controls", async () => {
    vi.stubGlobal("fetch", mockCalendarFetchWithQuoteResponse({}));

    render(<QuoteRequestForm />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Verificar email" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Usar otro email" })).not.toBeInTheDocument();
  });

  it("posts public quote data without an Authorization header and opens WhatsApp", async () => {
    const fetchMock = mockCalendarFetchWithQuoteResponse({
      quoteCode: "COT-2026-ABCDE",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<QuoteRequestForm />);
    fillRequiredQuoteFields(container);

    fireEvent.click(screen.getByRole("button", { name: "Registrar y continuar" }));

    expect(await screen.findByText("Cotización registrada")).toBeInTheDocument();
    expect(screen.getByText(/COT-2026-ABCDE/)).toBeInTheDocument();
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
    expect(screen.getByText(/Imágenes de referencia/)).toBeInTheDocument();
    expect(screen.getByText(/Adjunta allí las imágenes/)).toBeInTheDocument();
  });

  it("renders available calendar dates, disables unavailable dates, and stores the selected date", async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const availableDay = dateInMonth(currentMonth, 15);
    const fetchMock = mockCalendarFetchWithDates([
      { date: availableDay, status: "AVAILABLE" },
      { date: dateInMonth(currentMonth, 16), status: "PENDING_CONFIRMATION" },
      { date: dateInMonth(currentMonth, 17), status: "OCCUPIED" },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<QuoteRequestForm />);

    const availableDate = (await screen.findByText("Libre")).closest("button");
    const pendingDate = screen.getByText("Por confirmar").closest("button");
    const occupiedDate = screen.getByText("Ocupado").closest("button");

    expect(availableDate).not.toBeNull();
    expect(pendingDate).not.toBeNull();
    expect(occupiedDate).not.toBeNull();

    if (!availableDate || !pendingDate || !occupiedDate) {
      throw new Error("Expected calendar date buttons to render.");
    }

    expect(availableDate).toBeEnabled();
    expect(pendingDate).toBeDisabled();
    expect(occupiedDate).toBeDisabled();

    fireEvent.click(availableDate);

    expect(availableDate).toHaveAttribute("aria-pressed", "true");
    expect(
      container.querySelector<HTMLInputElement>('input[name="preferredTattooDate"]')?.value,
    ).toBe(availableDay);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("loads availability for the next month when navigating the public calendar", async () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const fetchMock = mockCalendarFetchWithDates([
      { date: dateInMonth(currentMonth, 15), status: "AVAILABLE" },
    ]);
    vi.stubGlobal("fetch", fetchMock);
    const nextMonth = addMonths(currentMonth, 1);

    render(<QuoteRequestForm />);

    await screen.findByText("Libre");
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/calendar/availability?month=${encodeURIComponent(nextMonth)}`,
      ),
    );
  });
});
