import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminStatusPanel } from "./admin-status-panel";

const mockGetIdToken = vi.fn();

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    firebaseConfigured: true,
    loading: false,
    user: { getIdToken: mockGetIdToken },
  }),
}));

vi.mock("@/lib/auth/login-panel", () => ({ LoginPanel: () => <div data-testid="login-panel" /> }));
vi.mock("@/lib/cms/admin-site-content-panel", () => ({
  AdminSiteContentPanel: () => <div data-testid="site-content-panel" />,
}));
vi.mock("@/lib/instagram/admin-instagram-media-panel", () => ({
  AdminInstagramMediaPanel: () => <div data-testid="instagram-panel" />,
}));
vi.mock("@/lib/portfolio/admin-portfolio-panel", () => ({
  AdminPortfolioPanel: () => <div data-testid="portfolio-panel" />,
}));
vi.mock("@/lib/reviews/admin-reviews-panel", () => ({
  AdminReviewsPanel: () => <div data-testid="reviews-panel" />,
}));
vi.mock("@/lib/sponsors/admin-sponsors-panel", () => ({
  AdminSponsorsPanel: () => <div data-testid="sponsors-panel" />,
}));
vi.mock("@/lib/shop/admin-products-panel", () => ({
  AdminProductsPanel: () => <div data-testid="products-panel" />,
}));

describe("AdminStatusPanel", () => {
  beforeEach(() => {
    mockGetIdToken.mockResolvedValue("admin-token");
    vi.restoreAllMocks();
  });

  it("refreshes recent quotes after loading an admin calendar month", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/admin/calendar") {
        return Response.json({
          dates: [{ date: "2026-07-18", status: "PENDING_CONFIRMATION" }],
        });
      }

      if (url === "/api/admin/quotes") {
        return Response.json({
          quotes: [
            {
              id: "quote-1",
              quoteCode: "COT-2026-AAAAA",
              createdAt: "2026-07-07T10:00:00.000Z",
              customerName: "Cliente Test",
              email: "cliente@example.test",
              phone: null,
              status: "pending",
              preferredContactMethod: "email",
              bodyPlacement: "Brazo",
              approximateSize: "8 cm",
              description: "Descripción de prueba",
              descriptionPreview: "Descripción de prueba",
              budgetClp: null,
              preferredTattooDate: "2026-07-18",
              calendarDateStatus: "PENDING_CONFIRMATION",
              consents: {
                dataProcessing: true,
                imageHandling: true,
                privacyTerms: true,
                marketingOptIn: false,
              },
              internalNote: "",
              deposit: null,
              referenceImages: [],
              referenceUrls: [],
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AdminStatusPanel
        initialStatus={{ authenticated: true, admin: true, profile: null }}
        imageUploadsEnabled={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cargar mes/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/quotes", expect.any(Object)),
    );
    expect(screen.getByText("COT-2026-AAAAA")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay solicitudes registradas.")).not.toBeInTheDocument();
  });

  it("approves a pending appointment and refetches quotes and calendar", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url === "/api/admin/calendar") {
        return Response.json({ dates: [{ date: "2026-07-18", status: "OCCUPIED" }] });
      }

      if (url === "/api/admin/quotes") {
        return Response.json({
          quotes: [
            {
              id: "quote-1",
              quoteCode: "COT-2026-AAAAA",
              createdAt: "2026-07-07T10:00:00.000Z",
              customerName: "Cliente Test",
              email: "cliente@example.test",
              phone: null,
              status: "pending",
              preferredContactMethod: "email",
              bodyPlacement: "Brazo",
              approximateSize: "8 cm",
              description: "Descripción de prueba",
              descriptionPreview: "Descripción de prueba",
              budgetClp: null,
              preferredTattooDate: "2026-07-18",
              calendarDateStatus: "PENDING_CONFIRMATION",
              consents: {
                dataProcessing: true,
                imageHandling: true,
                privacyTerms: true,
                marketingOptIn: false,
              },
              internalNote: "",
              deposit: null,
              referenceImages: [],
              referenceUrls: [],
            },
          ],
        });
      }

      if (url === "/api/admin/quotes/appointment") {
        return Response.json({
          quoteId: "quote-1",
          action: "approve",
          status: "contacted",
          calendarDateStatus: "CONFIRMED",
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AdminStatusPanel
        initialStatus={{ authenticated: true, admin: true, profile: null }}
        imageUploadsEnabled={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /cargar mes/i }));
    await screen.findByRole("button", { name: /aprobar cita/i });

    fireEvent.click(screen.getByRole("button", { name: /aprobar cita/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/quotes/appointment",
        expect.objectContaining({
          body: JSON.stringify({ quoteId: "quote-1", action: "approve" }),
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByText("Cita aprobada y fecha ocupada.")).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/calendar", expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/quotes", expect.any(Object));
  });
});
