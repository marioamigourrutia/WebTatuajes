import { describe, expect, it } from "vitest";
import { metadata } from "./page";

describe("contact page metadata", () => {
  it("describes contact, location, and support expectations", () => {
    expect(metadata.title).toBe("Contacto y ubicación");
    expect(metadata.description).toContain("atención por agenda");
    expect(metadata.description).toContain("soporte posterior");
  });
});
