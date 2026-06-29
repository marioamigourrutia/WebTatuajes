import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("includes collaborators in the main navigation", () => {
    render(<AppShell>Contenido</AppShell>);

    expect(screen.getByRole("link", { name: "Colaboradores" })).toHaveAttribute(
      "href",
      "/colaboradores",
    );
  });

  it("uses the visible WhatsApp phone number in the global CTA URL", () => {
    render(<AppShell>Contenido</AppShell>);

    expect(screen.getByRole("link", { name: "WhatsApp +56 9 7761 6917" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/56977616917?"),
    );
  });
});
