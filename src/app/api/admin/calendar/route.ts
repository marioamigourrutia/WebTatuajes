import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { blockAdminCalendarDate, unblockAdminCalendarDate } from "@/lib/calendar/reservation";

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
  const action = typeof data.action === "string" ? data.action : "";
  const result =
    action === "block"
      ? await blockAdminCalendarDate(firestore, data.date, authStatus.profile?.uid)
      : action === "unblock"
        ? await unblockAdminCalendarDate(firestore, data.date)
        : { ok: false as const, status: 400, error: "Acción de calendario no permitida." };

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ date: result.date, calendarDateStatus: result.calendarDateStatus });
}
