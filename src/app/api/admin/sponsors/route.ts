import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  createSponsor,
  deleteSponsor,
  listAdminSponsors,
  updateSponsor,
} from "@/lib/sponsors/admin-sponsors";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  try {
    const authStatus = await getServerAuthStatusFromIdToken(getBearerToken(request));
    if (!authStatus.authenticated) {
      return { ok: false as const, response: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
    }
    if (!authStatus.admin) {
      return { ok: false as const, response: NextResponse.json({ error: "Se requiere rol admin validado en servidor." }, { status: 403 }) };
    }
    return { ok: true as const };
  } catch (error) {
    console.error("Sponsors admin authentication failed", error);
    return { ok: false as const, response: NextResponse.json({ error: "No pudimos validar la sesión administrativa." }, { status: 503 }) };
  }
}

async function readJson(request: Request) {
  try {
    return { ok: true as const, body: await request.json() };
  } catch {
    return { ok: false as const, response: NextResponse.json({ error: "El pedido no tiene JSON válido." }, { status: 400 }) };
  }
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const firestore = getFirebaseAdminFirestore();
    if (!firestore) return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });
    return NextResponse.json({ sponsors: await listAdminSponsors(firestore) });
  } catch (error) {
    console.error("Sponsors admin list failed", error);
    return NextResponse.json({ error: "No pudimos cargar colaboradores en este momento." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const json = await readJson(request);
    if (!json.ok) return json.response;
    const result = await createSponsor(json.body);
    if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: result.status });
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("Sponsors admin create failed", error);
    return NextResponse.json({ error: "No pudimos crear el colaborador." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const firestore = getFirebaseAdminFirestore();
    if (!firestore) return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });
    const json = await readJson(request);
    if (!json.ok) return json.response;
    const data = json.body && typeof json.body === "object" ? (json.body as Record<string, unknown>) : {};
    const result = await updateSponsor(firestore, data.sponsorId, data);
    if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: result.status });
    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("Sponsors admin update failed", error);
    return NextResponse.json({ error: "No pudimos actualizar el colaborador." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  try {
    const firestore = getFirebaseAdminFirestore();
    if (!firestore) return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });
    const json = await readJson(request);
    if (!json.ok) return json.response;
    const data = json.body && typeof json.body === "object" ? (json.body as Record<string, unknown>) : {};
    const result = await deleteSponsor(firestore, data.sponsorId);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("Sponsors admin delete failed", error);
    return NextResponse.json({ error: "No pudimos eliminar el colaborador." }, { status: 500 });
  }
}
