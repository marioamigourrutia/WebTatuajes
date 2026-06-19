import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { recordQuoteDeposit } from "@/lib/quotes/quote-request";

export async function POST(request: Request) {
  const authStatus = await getServerAuthStatusFromIdToken(getBearerToken(request));

  if (!authStatus.authenticated) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (!authStatus.admin) {
    return NextResponse.json(
      { error: "Se requiere rol admin validado en servidor." },
      { status: 403 },
    );
  }

  const firestore = getFirebaseAdminFirestore();

  if (!firestore) {
    return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "El pedido no tiene JSON válido." }, { status: 400 });
  }

  const data = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const result = await recordQuoteDeposit(
    firestore,
    data.quoteId,
    data.deposit,
    authStatus.profile?.uid,
  );

  if (!result.ok) {
    return NextResponse.json(
      "errors" in result ? { errors: result.errors } : { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    quoteId: result.quoteId,
    calendarDateStatus: result.calendarDateStatus,
    deposit: result.deposit,
  });
}
