import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  createPortfolioItemFromFormData,
  listRecentAdminPortfolioItems,
} from "@/lib/portfolio/admin-portfolio";

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

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { errors: { form: "El pedido no tiene formulario válido." } },
      { status: 400 },
    );
  }

  const result = await createPortfolioItemFromFormData(formData);

  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: result.status });
  }

  return NextResponse.json({ id: result.id }, { status: 201 });
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);

  if (!admin.ok) return admin.response;

  const firestore = getFirebaseAdminFirestore();

  if (!firestore) {
    return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });
  }

  const items = await listRecentAdminPortfolioItems(firestore);

  return NextResponse.json({ items });
}
