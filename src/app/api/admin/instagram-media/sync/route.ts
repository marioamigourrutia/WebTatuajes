import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import {
  areInstagramApiCredentialsConfigured,
  getInstagramSyncDisabledMessage,
} from "@/lib/instagram/instagram-media";

export const runtime = "nodejs";

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

  if (!areInstagramApiCredentialsConfigured()) {
    return NextResponse.json(getInstagramSyncDisabledMessage(), { status: 501 });
  }

  return NextResponse.json(
    {
      message:
        "Sincronización oficial de Instagram pendiente de implementación. Credenciales detectadas, pero este slice no llama a Instagram todavía.",
      endpoint: "/{ig-user-id}/media",
    },
    { status: 501 },
  );
}
