import { NextResponse } from "next/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listPublicCalendarAvailability } from "@/lib/calendar/reservation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const firestore = getFirebaseAdminFirestore();

    if (!firestore) {
      return NextResponse.json(
        { error: "La disponibilidad no está conectada al backend en este entorno." },
        { status: 503 },
      );
    }

    const url = new URL(request.url);
    const result = await listPublicCalendarAvailability(firestore, {
      month: url.searchParams.get("month") ?? undefined,
      start: url.searchParams.get("start") ?? undefined,
      end: url.searchParams.get("end") ?? undefined,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ dates: result.dates });
  } catch {
    return NextResponse.json(
      { error: "No pudimos consultar la disponibilidad en este momento." },
      { status: 503 },
    );
  }
}
