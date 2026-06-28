import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { listRecentCommunityMembers } from "@/lib/community/member";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

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

  const communityMembers = await listRecentCommunityMembers(firestore);

  return NextResponse.json({ communityMembers });
}
