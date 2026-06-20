const maxExternalImageUrlLength = 2_048;

function stripIpv6Brackets(hostname: string) {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

function isIpv4Address(hostname: string) {
  const octets = hostname.split(".");

  if (octets.length !== 4 || octets.some((octet) => !/^\d{1,3}$/.test(octet))) {
    return false;
  }

  const parsedOctets = octets.map(Number);

  return parsedOctets.every((octet) => octet >= 0 && octet <= 255);
}

function isIpLiteralHostname(hostname: string) {
  const normalizedHostname = stripIpv6Brackets(hostname).toLowerCase();

  return isIpv4Address(normalizedHostname) || normalizedHostname.includes(":");
}

function isBlockedHostname(hostname: string) {
  const normalizedHostname = stripIpv6Brackets(hostname).toLowerCase();

  if (!normalizedHostname) return true;
  if (normalizedHostname === "localhost" || normalizedHostname.endsWith(".localhost")) return true;
  if (!normalizedHostname.includes(".")) return true;
  if (isIpLiteralHostname(hostname)) return true;

  return false;
}

function hasValidHttpSchemePrefix(value: string) {
  return /^https?:\/\//.test(value) && !/^https?:\/\/\//.test(value);
}

export function sanitizeExternalImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > maxExternalImageUrlLength) return null;
  if (!hasValidHttpSchemePrefix(trimmed)) return null;

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname) return null;
    if (isBlockedHostname(url.hostname)) return null;
    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

export function validateOptionalExternalImageUrl(value: unknown) {
  const rawValue = typeof value === "string" ? value.trim() : "";

  if (!rawValue) return { ok: true as const, value: null };

  const sanitizedUrl = sanitizeExternalImageUrl(rawValue);

  if (!sanitizedUrl) {
    return {
      ok: false as const,
      error: "Ingresa una URL pública de imagen que comience con http:// o https://.",
    };
  }

  return { ok: true as const, value: sanitizedUrl };
}
