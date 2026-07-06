import { NextResponse } from "next/server";
import { stripBotProtectionFields, validateBotProtection } from "@/lib/bot-protection";
import { createCommunityMember } from "@/lib/community/member";
import { checkRateLimit, getRateLimitOptions, getRequestRateLimitKey } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    getRequestRateLimitKey(request, "community-members"),
    getRateLimitOptions("community-members"),
  );
  if (!rateLimit.ok) {
    return NextResponse.json({ errors: { form: rateLimit.message } }, { status: 429 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: { form: "La inscripción no tiene JSON válido." } },
      { status: 400 },
    );
  }

  const botProtection = validateBotProtection(body);
  if (!botProtection.ok) {
    return NextResponse.json({ errors: botProtection.errors }, { status: botProtection.status });
  }

  const result = await createCommunityMember(stripBotProtectionFields(body));

  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: result.status });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
