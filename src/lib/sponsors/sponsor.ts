import {
  sanitizeExternalImageUrl,
  validateOptionalExternalImageUrl,
} from "@/lib/images/external-image-url";

export type SponsorInput = {
  name: string;
  category: string;
  description: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export type Sponsor = SponsorInput & {
  id: string;
  createdAt: string | null;
  updatedAt: string | null;
};

const maxLengths = {
  name: 100,
  category: 80,
  description: 280,
  websiteUrl: 2_048,
};

export function cleanSponsorString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function cleanLongText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\r\n/g, "\n") : "";
}

function serializeDate(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (value instanceof Date) return value.toISOString();

  return null;
}

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

function isBlockedPublicSponsorHostname(hostname: string) {
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

export function isValidSponsorId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{6,120}$/.test(value.trim());
}

function validateOptionalWebsiteUrl(value: unknown) {
  const rawValue = typeof value === "string" ? value.trim() : "";

  if (!rawValue) return { ok: true as const, value: null };
  if (rawValue.length > maxLengths.websiteUrl) {
    return { ok: false as const, error: "La URL del sitio web es demasiado larga." };
  }
  if (!hasValidHttpSchemePrefix(rawValue)) {
    return { ok: false as const, error: "Ingresa una URL que comience con http:// o https://." };
  }

  try {
    const url = new URL(rawValue);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { ok: false as const, error: "Ingresa una URL que comience con http:// o https://." };
    }

    if (isBlockedPublicSponsorHostname(url.hostname)) {
      return { ok: false as const, error: "Ingresa una URL pública válida." };
    }

    url.hash = "";
    return { ok: true as const, value: url.toString() };
  } catch {
    return { ok: false as const, error: "Ingresa una URL pública válida." };
  }
}

export function validateSponsorInput(input: unknown) {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const name = cleanSponsorString(data.name);
  const category = cleanSponsorString(data.category);
  const description = cleanLongText(data.description);
  const websiteUrlValidation = validateOptionalWebsiteUrl(data.websiteUrl);
  const logoUrlValidation = validateOptionalExternalImageUrl(data.logoUrl);
  const rawSortOrder = typeof data.sortOrder === "string" ? Number(data.sortOrder) : data.sortOrder;
  const sortOrder =
    typeof rawSortOrder === "number" && Number.isInteger(rawSortOrder) ? rawSortOrder : 0;
  const errors: Record<string, string> = {};

  if (!name) errors.name = "Ingresa el nombre del colaborador.";
  if (name.length > maxLengths.name) errors.name = "El nombre es demasiado largo.";
  if (!category) errors.category = "Ingresa una categoría.";
  if (category.length > maxLengths.category) errors.category = "La categoría es demasiado larga.";
  if (!description) errors.description = "Ingresa una descripción breve.";
  if (description.length > maxLengths.description) {
    errors.description = "La descripción es demasiado larga.";
  }
  if (!websiteUrlValidation.ok) errors.websiteUrl = websiteUrlValidation.error;
  if (!logoUrlValidation.ok) errors.logoUrl = logoUrlValidation.error;
  if (sortOrder < 0 || sortOrder > 999) errors.sortOrder = "Usa un orden entre 0 y 999.";

  if (Object.keys(errors).length > 0) return { ok: false as const, errors };

  return {
    ok: true as const,
    value: {
      name,
      category,
      description,
      websiteUrl: websiteUrlValidation.ok ? websiteUrlValidation.value : null,
      logoUrl: logoUrlValidation.ok ? logoUrlValidation.value : null,
      active: data.active === true || data.active === "true",
      sortOrder,
    } satisfies SponsorInput,
  };
}

export function mapSponsorToFirestore(input: SponsorInput) {
  return {
    name: input.name,
    category: input.category,
    description: input.description,
    website_url: input.websiteUrl,
    logo_url: input.logoUrl,
    active: input.active,
    sort_order: input.sortOrder,
  };
}

export function mapFirestoreSponsor(document: {
  id: string;
  data: () => Record<string, unknown>;
}): Sponsor {
  const data = document.data();
  const sortOrder =
    typeof data.sort_order === "number" && Number.isInteger(data.sort_order) ? data.sort_order : 0;
  const websiteUrlValidation = validateOptionalWebsiteUrl(data.website_url);

  return {
    id: document.id,
    name: cleanSponsorString(data.name) || "Colaborador sin nombre",
    category: cleanSponsorString(data.category) || "Colaborador",
    description: cleanLongText(data.description) || "Colaborador del estudio.",
    websiteUrl: websiteUrlValidation.ok ? websiteUrlValidation.value : null,
    logoUrl: sanitizeExternalImageUrl(data.logo_url),
    active: data.active === true,
    sortOrder,
    createdAt: serializeDate(data.created_at),
    updatedAt: serializeDate(data.updated_at),
  };
}

export function toPublicSponsor(sponsor: Sponsor): Sponsor {
  return sponsor;
}
