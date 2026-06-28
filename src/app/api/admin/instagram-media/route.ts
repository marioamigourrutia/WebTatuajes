import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  createManualInstagramMedia,
  listAdminInstagramMedia,
  updateInstagramMediaFlags,
} from "@/lib/instagram/instagram-media";

export const runtime = "nodejs";

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

function getConfiguredFirestore() {
  const firestore = getFirebaseAdminFirestore();

  if (!firestore) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Firebase Admin no está configurado." },
        { status: 503 },
      ),
    };
  }

  return { ok: true as const, firestore };
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const firestore = getConfiguredFirestore();
  if (!firestore.ok) return firestore.response;

  const items = await listAdminInstagramMedia(firestore.firestore);

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const firestore = getConfiguredFirestore();
  if (!firestore.ok) return firestore.response;

  const body = await readJson(request);
  if (!body)
    return NextResponse.json(
      { errors: { form: "El pedido no tiene JSON válido." } },
      { status: 400 },
    );

  const result = await createManualInstagramMedia(body, firestore.firestore);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: result.status });

  return NextResponse.json({ id: result.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const firestore = getConfiguredFirestore();
  if (!firestore.ok) return firestore.response;

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "El pedido no tiene JSON válido." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const result = await updateInstagramMediaFlags(firestore.firestore, data.itemId, data);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ itemId: result.itemId });
}
