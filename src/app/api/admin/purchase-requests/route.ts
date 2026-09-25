import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listRecentPurchaseRequests } from "@/lib/shop/purchase-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authStatus = await getServerAuthStatusFromIdToken(getBearerToken(request));
    if (!authStatus.authenticated) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (!authStatus.admin) return NextResponse.json({ error: "Se requiere rol admin validado en servidor." }, { status: 403 });

    const firestore = getFirebaseAdminFirestore();
    if (!firestore) return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });

    return NextResponse.json({ purchaseRequests: await listRecentPurchaseRequests(firestore) });
  } catch (error) {
    console.error("Admin purchase requests list failed", error);
    return NextResponse.json({ error: "No pudimos cargar las solicitudes de compra." }, { status: 500 });
  }
}
