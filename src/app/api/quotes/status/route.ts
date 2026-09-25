import { NextResponse } from "next/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getClientQuoteStatusByCode } from "@/lib/quotes/quote-request";
import { checkRateLimit, getRateLimitOptions, getRequestRateLimitKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(
    getRequestRateLimitKey(request, "quotes-status"),
    getRateLimitOptions("quotes-status"),
  );
  if (!rateLimit.ok) {
    return NextResponse.json({ errors: { form: rateLimit.message } }, { status: 429 });
  }

  try {
    const firestore = getFirebaseAdminFirestore();

    if (!firestore) {
      return NextResponse.json(
        { errors: { form: "El seguimiento no está disponible temporalmente." } },
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
  } catch (error) {
    console.error("Quote status lookup failed", error);
    return NextResponse.json(
      { errors: { form: "No pudimos consultar la cotización en este momento. Intenta nuevamente más tarde." } },
      { status: 503 },
    );
  }
}
