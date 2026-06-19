import { describe, expect, it } from "vitest";
import {
  aftercareSteps,
  bookingExpectations,
  hygienePractices,
  serviceFaqs,
  tattooServices,
} from "./public-services";

describe("public services content", () => {
  it("covers services, booking expectations, hygiene, aftercare and FAQs", () => {
    expect(tattooServices.length).toBeGreaterThanOrEqual(4);
    expect(bookingExpectations).toEqual(
      expect.arrayContaining([expect.stringContaining("cotización")]),
    );
    expect(hygienePractices).toEqual(
      expect.arrayContaining([expect.stringContaining("estériles")]),
    );
    expect(aftercareSteps).toEqual(
      expect.arrayContaining([expect.stringContaining("sol directo")]),
    );
    expect(serviceFaqs.map((faq) => faq.question)).toEqual(
      expect.arrayContaining([expect.stringContaining("diseño final")]),
    );
  });
});
