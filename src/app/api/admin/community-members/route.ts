import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { buildCommunityMembersCsv, listRecentCommunityMembers } from "@/lib/community/member";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

async function requireAdmin(request: Request) {
  const authStatus = await getServerAuthStatusFromIdToken(getBearerToken(request));

  if (!authStatus.authenticated) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    };
  }

  if (!authStatus.admin) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Se requiere rol admin validado en servidor." },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const };
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const firestore = getFirebaseAdminFirestore();

  if (!firestore) {
    return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });
  }

  const communityMembers = await listRecentCommunityMembers(firestore);

  return NextResponse.json({ communityMembers });
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const firestore = getFirebaseAdminFirestore();

  if (!firestore) {
    return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });
  }

  const csv = buildCommunityMembersCsv(await listRecentCommunityMembers(firestore, 1000));

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="webtatuajes-community-members.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
