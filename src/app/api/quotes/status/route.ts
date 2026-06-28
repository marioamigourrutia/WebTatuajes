import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { verifyCustomerIdToken } from "@/lib/auth/customer-token";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listClientQuoteStatusesByCustomerId } from "@/lib/quotes/quote-request";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const tokenVerification = await verifyCustomerIdToken(getBearerToken(request));

  if (!tokenVerification.ok) {
    return NextResponse.json(
      { errors: tokenVerification.errors },
      { status: tokenVerification.status },
    );
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
  const result = await listClientQuoteStatusesByCustomerId(
    firestore,
    tokenVerification.customer.uid,
    quoteCode,
  );

  if (!result.ok) {
    return NextResponse.json({ errors: { form: result.error } }, { status: result.status });
  }

  return NextResponse.json({ quotes: result.quotes });
}
