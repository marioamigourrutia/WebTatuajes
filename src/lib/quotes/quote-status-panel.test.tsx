import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuoteStatusPanel } from "./quote-status-panel";

describe("QuoteStatusPanel", () => {
  it("explains the public code and email status lookup without Firebase sign-in", () => {
    render(<QuoteStatusPanel initialQuoteCode="cot-2026-aaaaa" />);

    expect(screen.getByRole("heading", { name: "Consulta con código y email" })).toBeInTheDocument();
    expect(screen.getByText(/COT-2026-AAAAA/)).toBeInTheDocument();
    expect(screen.getByText(/No necesitas iniciar sesión/)).toBeInTheDocument();
  });
});
