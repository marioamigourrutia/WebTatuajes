export const botProtectionFields = {
  honeypot: "companyWebsite",
  submittedAt: "submittedAt",
} as const;

export const botProtectionMinSubmitMs = 1200;

export type BotProtectionResult =
  | { ok: true }
  | { ok: false; errors: { form: string }; status: 400 };

const genericBotProtectionError = "No pudimos procesar la solicitud. Intenta nuevamente.";

function getFieldValue(payload: unknown, field: string) {
  if (isFormDataLike(payload)) {
    const value = payload.get(field);
    return typeof value === "string" ? value : "";
  }

  if (!payload || typeof payload !== "object") return "";

  const value = (payload as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}

function isFormDataLike(payload: unknown): payload is FormData {
  return (
    typeof FormData !== "undefined" &&
    Boolean(payload) &&
    typeof (payload as FormData).get === "function" &&
    typeof (payload as FormData).entries === "function"
  );
}

export function validateBotProtection(payload: unknown, now = Date.now()): BotProtectionResult {
  const honeypot = getFieldValue(payload, botProtectionFields.honeypot).trim();
  if (honeypot) {
    return { ok: false, errors: { form: genericBotProtectionError }, status: 400 };
  }

  const submittedAtValue = getFieldValue(payload, botProtectionFields.submittedAt).trim();
  const submittedAt = Number(submittedAtValue);

  if (!submittedAtValue || !Number.isFinite(submittedAt)) {
    return { ok: false, errors: { form: genericBotProtectionError }, status: 400 };
  }

  if (submittedAt > now || now - submittedAt < botProtectionMinSubmitMs) {
    return { ok: false, errors: { form: genericBotProtectionError }, status: 400 };
  }

  return { ok: true };
}

export function stripBotProtectionFields<T>(payload: T): T {
  if (isFormDataLike(payload)) {
    const formData = new FormData();
    for (const [key, value] of payload.entries()) {
      if (key === botProtectionFields.honeypot || key === botProtectionFields.submittedAt) {
        continue;
      }
      formData.append(key, value);
    }

    return formData as T;
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;

  const rest = { ...(payload as Record<string, unknown>) };
  delete rest[botProtectionFields.honeypot];
  delete rest[botProtectionFields.submittedAt];

  return rest as T;
}
