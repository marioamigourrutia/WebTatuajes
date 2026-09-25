import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  blockAdminCalendarDate,
  bulkUpdateAdminCalendarDates,
  listAdminCalendarMonth,
  unblockAdminCalendarDate,
} from "@/lib/calendar/reservation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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

    if (action === "list") {
      const result = await listAdminCalendarMonth(firestore, { month: data.month });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ dates: result.dates });
    }

    if (action === "bulkBlock" || action === "bulkUnblock") {
      const result = await bulkUpdateAdminCalendarDates(firestore, {
        action: action === "bulkBlock" ? "block" : "unblock",
        dates: data.dates,
        adminUid: authStatus.profile?.uid,
      });
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ updated: result.updated, skipped: result.skipped });
    }

    const result =
      action === "block"
        ? await blockAdminCalendarDate(firestore, data.date, authStatus.profile?.uid)
        : action === "unblock"
          ? await unblockAdminCalendarDate(firestore, data.date)
          : { ok: false as const, status: 400, error: "Acción de calendario no permitida." };

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ date: result.date, calendarDateStatus: result.calendarDateStatus });
  } catch (error) {
    console.error("Admin calendar operation failed", error);
    return NextResponse.json(
      { error: "No pudimos procesar el calendario administrativo en este momento." },
      { status: 500 },
    );
  }
}
