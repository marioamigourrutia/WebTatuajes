import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { sendSignInLinkToEmail } from "firebase/auth";
import { QuoteRequestForm } from "./quote-request-form";

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({ app: { name: "test" } }),
}));

vi.mock("firebase/auth", () => ({
  isSignInWithEmailLink: () => false,
  onAuthStateChanged: (_auth: unknown, callback: (user: null) => void) => {
    callback(null);
    return () => undefined;
  },
  sendSignInLinkToEmail: vi.fn(),
  signInWithEmailLink: vi.fn(),
}));

describe("QuoteRequestForm email verification", () => {
  it("shows an actionable WhatsApp fallback when sending the email link fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dates: [] }) }),
    );
    vi.mocked(sendSignInLinkToEmail).mockRejectedValueOnce(new Error("auth configuration error"));

    const { container } = render(<QuoteRequestForm />);
    const emailInput = container.querySelector<HTMLInputElement>('input[name="email"]');

    expect(emailInput).not.toBeNull();
    fireEvent.change(emailInput!, { target: { value: "ana@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: "Verificar email" }));

    expect(await screen.findByText(/No pudimos enviar el enlace/)).toBeInTheDocument();
    expect(screen.getByText(/la cotización no se ha enviado/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contactar por WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/"),
    );
    expect(screen.queryByText("Solicitud recibida correctamente.")).not.toBeInTheDocument();
    await waitFor(() => expect(sendSignInLinkToEmail).toHaveBeenCalledTimes(1));
  });
});
