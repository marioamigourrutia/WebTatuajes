import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listRecentQuoteRequests } from "@/lib/quotes/quote-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authStatus = await getServerAuthStatusFromIdToken(getBearerToken(request));
    if (!authStatus.authenticated) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (!authStatus.admin) return NextResponse.json({ error: "Se requiere rol admin validado en servidor." }, { status: 403 });

    const firestore = getFirebaseAdminFirestore();
    if (!firestore) return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });

    return NextResponse.json({ quotes: await listRecentQuoteRequests(firestore) });
  } catch (error) {
    console.error("Admin quotes list failed", error);
    return NextResponse.json({ error: "No pudimos cargar las cotizaciones recientes." }, { status: 500 });
  }
}
