import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { uploadImageToExternalProvider } from "@/lib/images/upload-provider";
import { createManualInstagramMedia } from "@/lib/instagram/instagram-media";

export const runtime = "nodejs";

async function requireAdmin(request: Request) {
  try {
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
  } catch (error) {
    console.error("Editorial image authentication failed", error);
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "No pudimos validar la sesión administrativa." },
        { status: 503 },
      ),
    };
  }
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

export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const firestore = getConfiguredFirestore();
    if (!firestore.ok) return firestore.response;

    const formData = await request.formData();
    const file = formData.get("image");
    const caption = String(formData.get("caption") ?? "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json(
        { errors: { image: "Selecciona una imagen JPG, PNG o WEBP." } },
        { status: 400 },
      );
    }

    if (!caption) {
      return NextResponse.json(
        { errors: { caption: "Agrega una descripción breve para identificar la imagen." } },
        { status: 400 },
      );
    }

    const upload = await uploadImageToExternalProvider(file, "editorial");
    if (!upload.ok) {
      return NextResponse.json({ errors: upload.errors }, { status: upload.status });
    }

    if (!upload.image.secureUrl) {
      return NextResponse.json(
        { errors: { image: "El proveedor no devolvió una URL pública segura." } },
        { status: 502 },
      );
    }

    const result = await createManualInstagramMedia(
      {
        externalId: `editorial-${crypto.randomUUID()}`,
        mediaType: "IMAGE",
        caption,
        description: String(formData.get("description") ?? ""),
        mediaUrl: upload.image.secureUrl,
        thumbnailUrl: upload.image.secureUrl,
        permalink: String(formData.get("permalink") ?? ""),
        timestamp: "",
        hidden: false,
        featured: formData.get("featured") === "on",
        pinned: formData.get("pinned") === "on",
        showOnHome: formData.get("showOnHome") === "on",
        portfolioOnly: false,
        order: formData.get("order") ?? "",
      },
      firestore.firestore,
    );

    if (!result.ok) {
      return NextResponse.json({ errors: result.errors }, { status: result.status });
    }

    return NextResponse.json(
      { id: result.id, mediaUrl: upload.image.secureUrl },
      { status: 201 },
    );
  } catch (error) {
    console.error("Editorial image upload failed", error);
    return NextResponse.json(
      { errors: { form: "No pudimos subir la imagen editorial." } },
      { status: 500 },
    );
  }
}
