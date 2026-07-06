import { describe, expect, it } from "vitest";
import {
  botProtectionFields,
  botProtectionMinSubmitMs,
  stripBotProtectionFields,
  validateBotProtection,
} from "./bot-protection";

const now = 1_800_000_000_000;

function legitimatePayload() {
  return {
    [botProtectionFields.honeypot]: "",
    [botProtectionFields.submittedAt]: String(now - botProtectionMinSubmitMs - 1),
  };
}

describe("bot protection", () => {
  it("accepts a legitimate delayed JSON payload", () => {
    expect(validateBotProtection(legitimatePayload(), now)).toEqual({ ok: true });
  });

  it("rejects a filled honeypot without exposing bot protection details", () => {
    const result = validateBotProtection(
      { ...legitimatePayload(), [botProtectionFields.honeypot]: "https://spam.test" },
      now,
    );

    expect(result).toEqual({
      ok: false,
      errors: { form: "No pudimos procesar la solicitud. Intenta nuevamente." },
      status: 400,
    });
  });

  it("rejects submissions that are too fast", () => {
    expect(
      validateBotProtection(
        { ...legitimatePayload(), [botProtectionFields.submittedAt]: String(now - 500) },
        now,
      ),
    ).toMatchObject({ ok: false, status: 400 });
  });

  it("strips protection-only fields before passing JSON to domain helpers", () => {
    expect(stripBotProtectionFields({ ...legitimatePayload(), email: "ana@example.test" })).toEqual(
      {
        email: "ana@example.test",
      },
    );
  });

  it("accepts and strips protection fields from form data", () => {
    const formData = new FormData();
    formData.set(botProtectionFields.honeypot, "");
    formData.set(botProtectionFields.submittedAt, String(now - botProtectionMinSubmitMs - 1));
    formData.set("email", "ana@example.test");

    expect(validateBotProtection(formData, now)).toEqual({ ok: true });

    const stripped = stripBotProtectionFields(formData);
    expect(stripped.get("email")).toBe("ana@example.test");
    expect(stripped.has(botProtectionFields.honeypot)).toBe(false);
    expect(stripped.has(botProtectionFields.submittedAt)).toBe(false);
  });
});
