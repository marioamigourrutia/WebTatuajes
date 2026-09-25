import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuoteStatusPanel } from "./quote-status-panel";

describe("QuoteStatusPanel", () => {
  it("supports the public code and email lookup without Firebase sign-in controls", () => {
    render(<QuoteStatusPanel initialQuoteCode="cot-2026-aaaaa" />);

    expect(screen.getByLabelText("Código de cotización")).toHaveValue("COT-2026-AAAAA");
    expect(screen.getByLabelText("Email usado al cotizar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Consultar" })).toBeInTheDocument();
    expect(screen.queryByText(/iniciar sesión/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Firebase|Google/i })).not.toBeInTheDocument();
  });
});
