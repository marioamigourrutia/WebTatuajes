import { describe, expect, it } from "vitest";
import { metadata } from "./page";

describe("services page metadata", () => {
  it("describes the public services and care route", () => {
    expect(metadata.title).toBe("Servicios y cuidados");
    expect(metadata.description).toContain("cuidados posteriores");
  });
});
