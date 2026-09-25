import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { buildCommunityMembersCsv, listRecentCommunityMembers } from "@/lib/community/member";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  try {
    const authStatus = await getServerAuthStatusFromIdToken(getBearerToken(request));
    if (!authStatus.authenticated) return { ok: false as const, response: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
    if (!authStatus.admin) return { ok: false as const, response: NextResponse.json({ error: "Se requiere rol admin validado en servidor." }, { status: 403 }) };
    return { ok: true as const };
  } catch (error) {
    console.error("Community admin authentication failed", error);
    return { ok: false as const, response: NextResponse.json({ error: "No pudimos validar la sesión administrativa." }, { status: 503 }) };
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const firestore = getFirebaseAdminFirestore();
    if (!firestore) return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });
    return NextResponse.json({ communityMembers: await listRecentCommunityMembers(firestore) });
  } catch (error) {
    console.error("Community admin list failed", error);
    return NextResponse.json({ error: "No pudimos cargar los miembros de comunidad." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const firestore = getFirebaseAdminFirestore();
    if (!firestore) return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });
    const csv = buildCommunityMembersCsv(await listRecentCommunityMembers(firestore, 1000));
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="webtatuajes-community-members.csv"',
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Community admin export failed", error);
    return NextResponse.json({ error: "No pudimos exportar los miembros de comunidad." }, { status: 500 });
  }
}
