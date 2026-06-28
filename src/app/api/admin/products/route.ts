import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { createProduct, hideProduct, listAdminProducts, updateProduct } from "@/lib/shop/product";

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

async function readJson(request: Request) {
  try {
    return { ok: true as const, body: await request.json() };
  } catch {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "El pedido no tiene JSON válido." }, { status: 400 }),
    };
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const firestore = getFirebaseAdminFirestore();
  if (!firestore)
    return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });

  return NextResponse.json({ products: await listAdminProducts(firestore) });
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const json = await readJson(request);
  if (!json.ok) return json.response;

  const result = await createProduct(json.body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: result.status });

  return NextResponse.json({ id: result.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const firestore = getFirebaseAdminFirestore();
  if (!firestore)
    return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });

  const json = await readJson(request);
  if (!json.ok) return json.response;

  const data =
    json.body && typeof json.body === "object" ? (json.body as Record<string, unknown>) : {};
  const result = await updateProduct(firestore, data.productId, data);

  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: result.status });

  return NextResponse.json({ id: result.id });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const firestore = getFirebaseAdminFirestore();
  if (!firestore)
    return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });

  const json = await readJson(request);
  if (!json.ok) return json.response;

  const data =
    json.body && typeof json.body === "object" ? (json.body as Record<string, unknown>) : {};
  const result = await hideProduct(firestore, data.productId);

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ id: result.id });
}
