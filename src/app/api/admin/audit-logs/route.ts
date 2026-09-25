import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { listRecentAuditLogs } from "@/lib/audit-log";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authStatus = await getServerAuthStatusFromIdToken(getBearerToken(request));
    if (!authStatus.authenticated) return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    if (!authStatus.admin) return NextResponse.json({ error: "Se requiere rol admin validado en servidor." }, { status: 403 });

    const firestore = getFirebaseAdminFirestore();
    if (!firestore) return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });

    return NextResponse.json({ auditLogs: await listRecentAuditLogs(firestore) });
  } catch (error) {
    console.error("Admin audit list failed", error);
    return NextResponse.json({ error: "No pudimos cargar la auditoría reciente." }, { status: 500 });
  }
}
