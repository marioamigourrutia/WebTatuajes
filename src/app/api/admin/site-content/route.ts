import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { getSiteContent, saveSiteContent } from "@/lib/cms/site-content";

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
    console.error("Site content admin authentication failed", error);
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
    return NextResponse.json({ content: await getSiteContent(firestore) });
  } catch (error) {
    console.error("Site content admin read failed", error);
    return NextResponse.json({ error: "No pudimos cargar la configuración del sitio." }, { status: 500 });
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

    const result = await saveSiteContent(firestore, json.body);
    if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: result.status });

    return NextResponse.json({ content: result.content });
  } catch (error) {
    console.error("Site content admin save failed", error);
    return NextResponse.json({ error: "No pudimos guardar la configuración del sitio." }, { status: 500 });
  }
}

export const PUT = PATCH;
