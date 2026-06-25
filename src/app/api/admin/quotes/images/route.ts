import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "@/lib/firebase/admin";
import {
  createAdminQuoteReferenceImageSignedUrl,
  getAdminQuoteReferenceImageFile,
} from "@/lib/quotes/quote-request";

function safeContentDispositionFilename(filename: string) {
  return filename.replace(/[\r\n"\\]/g, "_");
}

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const imageResult = await getAdminQuoteReferenceImageFile(
    firestore,
    url.searchParams.get("imageId"),
    url.searchParams.get("quoteId") ?? undefined,
  );

  if (!imageResult.ok) {
    return NextResponse.json({ error: imageResult.error }, { status: imageResult.status });
  }

  if (imageResult.file.provider === "supabase") {
    const signedUrl = await createAdminQuoteReferenceImageSignedUrl(imageResult.file);

    if (!signedUrl.ok) {
      return NextResponse.json({ error: signedUrl.error }, { status: signedUrl.status });
    }

    return NextResponse.redirect(signedUrl.signedUrl, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const storageBucket = getFirebaseAdminStorageBucket();

  if (!storageBucket) {
    return NextResponse.json(
      { error: "Firebase Admin Storage no está configurado." },
      { status: 503 },
    );
  }

  let buffer: Buffer;

  try {
    [buffer] = await storageBucket.file(imageResult.file.storagePath).download();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la imagen privada." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${safeContentDispositionFilename(imageResult.file.originalFilename)}"`,
      "Content-Type": imageResult.file.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
