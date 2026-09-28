import { NextResponse } from "next/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listPublicCalendarAvailability } from "@/lib/calendar/reservation";

export const runtime = "nodejs";

const productionOrigin = "https://webtatuajes.vercel.app";

async function readProductionAvailability(request: Request) {
  const requestUrl = new URL(request.url);

  if (requestUrl.origin === productionOrigin) {
    return null;
  }

  try {
    const targetUrl = new URL("/api/calendar/availability", productionOrigin);
    targetUrl.search = requestUrl.search;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const body = (await response.json()) as { dates?: unknown };
    if (!Array.isArray(body.dates)) return null;

    return NextResponse.json({ dates: body.dates, source: "production-readonly" });
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const firestore = getFirebaseAdminFirestore();

    if (!firestore) {
      const fallback = await readProductionAvailability(request);
      if (fallback) return fallback;

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
    const fallback = await readProductionAvailability(request);
    if (fallback) return fallback;

    return NextResponse.json(
      { error: "No pudimos consultar la disponibilidad en este momento." },
      { status: 503 },
    );
  }
}
