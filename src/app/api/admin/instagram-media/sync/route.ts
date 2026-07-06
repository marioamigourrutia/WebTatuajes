import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { syncInstagramMediaFromGraph } from "@/lib/instagram/instagram-media";

export const runtime = "nodejs";

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

  const result = await syncInstagramMediaFromGraph(firestore);

  if (!result.ok) return NextResponse.json(result.summary, { status: result.status });

  return NextResponse.json({
    message: "Sincronización de Instagram ejecutada con API oficial de Meta.",
    ...result.summary,
  });
}
