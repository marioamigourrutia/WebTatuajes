import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listAdminReviews } from "@/lib/reviews/review";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  const authStatus = await getServerAuthStatusFromIdToken(getBearerToken(request));
  if (!authStatus.authenticated)
    return {
      ok: false as const,
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    };
  if (!authStatus.admin)
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Se requiere rol admin validado en servidor." },
        { status: 403 },
      ),
    };
  return { ok: true as const };
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const firestore = getFirebaseAdminFirestore();
  if (!firestore)
    return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });

  return NextResponse.json({ reviews: await listAdminReviews(firestore) });
}
