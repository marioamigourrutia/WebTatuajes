type RateLimitState = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitState>();

export type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
};

const rateLimitEnvKeys: Record<string, { limit: string; windowMs: string }> = {
  "community-members": {
    limit: "RATE_LIMIT_COMMUNITY_MEMBERS_LIMIT",
    windowMs: "RATE_LIMIT_COMMUNITY_MEMBERS_WINDOW_MS",
  },
  "community-members-unsubscribe": {
    limit: "RATE_LIMIT_COMMUNITY_MEMBERS_UNSUBSCRIBE_LIMIT",
    windowMs: "RATE_LIMIT_COMMUNITY_MEMBERS_UNSUBSCRIBE_WINDOW_MS",
  },
  "purchase-requests": {
    limit: "RATE_LIMIT_PURCHASE_REQUESTS_LIMIT",
    windowMs: "RATE_LIMIT_PURCHASE_REQUESTS_WINDOW_MS",
  },
  quotes: { limit: "RATE_LIMIT_QUOTES_LIMIT", windowMs: "RATE_LIMIT_QUOTES_WINDOW_MS" },
  reviews: { limit: "RATE_LIMIT_REVIEWS_LIMIT", windowMs: "RATE_LIMIT_REVIEWS_WINDOW_MS" },
};

function readPositiveIntegerEnv(name: string | undefined) {
  if (!name) return undefined;

  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

export function getRateLimitOptions(scope: string): RateLimitOptions {
  const keys = rateLimitEnvKeys[scope];

  return {
    limit: readPositiveIntegerEnv(keys?.limit) ?? readPositiveIntegerEnv("RATE_LIMIT_DEFAULT_LIMIT"),
    windowMs:
      readPositiveIntegerEnv(keys?.windowMs) ?? readPositiveIntegerEnv("RATE_LIMIT_DEFAULT_WINDOW_MS"),
  };
}

export function getRequestRateLimitKey(request: Request, scope: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const client = forwardedFor || realIp || "unknown";

  return `${scope}:${client}`;
}

export function checkRateLimit(
  key: string,
  { limit = 20, windowMs = 60_000 }: RateLimitOptions = {},
) {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true as const, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    return {
      ok: false as const,
      status: 429,
      message: "Demasiadas solicitudes. Intenta nuevamente en unos minutos.",
    };
  }

  current.count += 1;
  return { ok: true as const, remaining: limit - current.count };
}

export function resetRateLimitForTests() {
  buckets.clear();
}
