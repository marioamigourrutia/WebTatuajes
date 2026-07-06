import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/lib/auth/auth-context";
import { QuoteStatusPanel } from "./quote-status-panel";

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);

describe("QuoteStatusPanel", () => {
  it("explains the verified email flow when the client is not signed in", () => {
    useAuthMock.mockReturnValue({ firebaseConfigured: true, loading: false, user: null });

    render(<QuoteStatusPanel />);

    expect(screen.getByText(/Las nuevas cotizaciones se protegen/)).toBeInTheDocument();
    expect(screen.getByText(/código y email sigue disponible/)).toBeInTheDocument();
  });

  it("loads authenticated quote statuses with the Firebase ID token", async () => {
    const getIdToken = vi.fn().mockResolvedValue("id-token");
    useAuthMock.mockReturnValue({
      firebaseConfigured: true,
      loading: false,
      user: { emailVerified: true, getIdToken } as never,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          quotes: [{ quoteCode: "COT-2026-AAAAA", status: "pending", preferredTattooDate: null }],
        }),
      }),
    );

    render(<QuoteStatusPanel initialQuoteCode="cot-2026-aaaaa" />);

    expect(await screen.findByText("COT-2026-AAAAA")).toBeInTheDocument();
    await waitFor(() => expect(getIdToken).toHaveBeenCalled());
    expect(fetch).toHaveBeenCalledWith("/api/quotes/status?quoteCode=COT-2026-AAAAA", {
      headers: { Authorization: "Bearer id-token" },
    });
  });
});
