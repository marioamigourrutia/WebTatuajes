import { NextResponse } from "next/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getClientQuoteStatusByCode } from "@/lib/quotes/quote-request";
import { checkRateLimit, getRateLimitOptions, getRequestRateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(
    getRequestRateLimitKey(request, "quotes-status"),
    getRateLimitOptions("quotes"),
  );
  if (!rateLimit.ok) {
    return NextResponse.json({ errors: { form: rateLimit.message } }, { status: 429 });
  }

  const firestore = getFirebaseAdminFirestore();

  if (!firestore) {
    return NextResponse.json(
      { errors: { form: "Firebase Admin no está configurado." } },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const quoteCode = url.searchParams.get("quoteCode") ?? undefined;
  const email = url.searchParams.get("email") ?? undefined;
  const result = await getClientQuoteStatusByCode(firestore, quoteCode, email);

  if (!result.ok) {
    return NextResponse.json({ errors: { form: result.error } }, { status: result.status });
  }

  return NextResponse.json({ quotes: [result.quote] });
}
