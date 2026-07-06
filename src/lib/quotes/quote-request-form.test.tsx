import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendSignInLinkToEmail, signOut } from "firebase/auth";
import { QuoteRequestForm } from "./quote-request-form";

const authState = vi.hoisted(() => ({
  currentUser: null as null | { email: string; emailVerified: boolean; getIdToken: () => Promise<string> },
}));

vi.mock("@/lib/firebase/client", () => ({
  getFirebaseAuth: () => ({ app: { name: "test" } }),
}));

vi.mock("firebase/auth", () => ({
  isSignInWithEmailLink: () => false,
  onAuthStateChanged: (_auth: unknown, callback: (user: typeof authState.currentUser) => void) => {
    callback(authState.currentUser);
    return () => undefined;
  },
  sendSignInLinkToEmail: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
  signInWithEmailLink: vi.fn(),
}));

describe("QuoteRequestForm email verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.currentUser = null;
  });

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
    expect(screen.getByText(/Verificación de email obligatoria/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contactar por WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/"),
    );
    expect(screen.queryByText("Solicitud recibida correctamente.")).not.toBeInTheDocument();
    await waitFor(() => expect(sendSignInLinkToEmail).toHaveBeenCalledTimes(1));
  });

  it("blocks submission without verified email before posting", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.startsWith("/api/calendar/availability")) {
        return { ok: true, json: async () => ({ dates: [] }) };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<QuoteRequestForm />);

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

    const submitButton = screen.getByRole("button", { name: "Enviar solicitud" });
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);

    expect(await screen.findAllByText(/Verificación de email obligatoria/)).toHaveLength(2);
    expect(fetchMock.mock.calls.some(([input]) => String(input) === "/api/quotes")).toBe(false);
    expect(screen.queryByText("Solicitud recibida correctamente.")).not.toBeInTheDocument();
  });

  it("allows switching away from a verified email stored in the browser session", async () => {
    authState.currentUser = {
      email: "owner@example.test",
      emailVerified: true,
      getIdToken: async () => "verified-token",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ dates: [] }) }),
    );

    const { container } = render(<QuoteRequestForm />);
    const emailInput = container.querySelector<HTMLInputElement>('input[name="email"]');

    expect(emailInput).toHaveValue("owner@example.test");
    expect(emailInput).toHaveAttribute("readonly");

    fireEvent.click(screen.getByRole("button", { name: "Usar otro email" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(emailInput).toHaveValue("");
    expect(emailInput).not.toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Verificar email" })).toBeEnabled();
  });
});
