import { describe, expect, it } from "vitest";
import {
  contactHighlights,
  contactLinks,
  supportExpectations,
  visitExpectations,
} from "./public-contact";

describe("public contact content", () => {
  it("covers contact intent, location expectations, support, and related routes", () => {
    expect(contactHighlights.map((item) => item.title).join(" ")).toContain("Ubicación");
    expect(visitExpectations.join(" ")).toContain("piel");
    expect(supportExpectations.join(" ")).toContain("cuidados posteriores");
    expect(contactLinks.map((link) => link.href)).toEqual([
      "/quote",
      "/quote/status",
      "/opiniones",
    ]);
  });
});
