import { NextResponse } from "next/server";
import { getFirebaseAdminFirestore, getFirebaseAdminStorageBucket } from "@/lib/firebase/admin";
import { getPublishedPortfolioImageFile } from "@/lib/portfolio/admin-portfolio";

function safeContentDispositionFilename(itemId: string, mimeType: string) {
  const extensionByMimeType: Record<string, string> = {
    "image/avif": "avif",
    "image/gif": "gif",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const safeItemId = itemId.replace(/[^A-Za-z0-9_-]/g, "_");
  const extension = extensionByMimeType[mimeType] ?? "img";

  return `portfolio-${safeItemId}.${extension}`;
}

export async function GET(request: Request) {
  const firestore = getFirebaseAdminFirestore();
  const storageBucket = getFirebaseAdminStorageBucket();

  if (!firestore || !storageBucket) {
    return NextResponse.json(
      { error: "Firebase Admin Storage no está configurado." },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const imageResult = await getPublishedPortfolioImageFile(
    firestore,
    url.searchParams.get("itemId"),
  );

  if (!imageResult.ok) {
    return NextResponse.json({ error: imageResult.error }, { status: imageResult.status });
  }

  let buffer: Buffer;

  try {
    [buffer] = await storageBucket.file(imageResult.file.storagePath).download();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la imagen." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Disposition": `inline; filename="${safeContentDispositionFilename(
        url.searchParams.get("itemId") ?? "image",
        imageResult.file.mimeType,
      )}"`,
      "Content-Type": imageResult.file.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
