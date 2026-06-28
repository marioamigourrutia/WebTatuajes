import { NextResponse } from "next/server";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listPublishedReviews, submitReviewWithToken } from "@/lib/reviews/review";

export const runtime = "nodejs";

export async function GET() {
  const firestore = getFirebaseAdminFirestore();
  if (!firestore) return NextResponse.json({ reviews: [] });

  const reviews = await listPublishedReviews(firestore);
  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  const firestore = getFirebaseAdminFirestore();
  if (!firestore) {
    return NextResponse.json(
      { errors: { form: "Firebase Admin no está configurado." } },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: { form: "El pedido no tiene JSON válido." } },
      { status: 400 },
    );
  }

  const result = await submitReviewWithToken(firestore, body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: result.status });

  return NextResponse.json({ id: result.id }, { status: 201 });
}
