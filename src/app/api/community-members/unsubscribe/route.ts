import { NextResponse } from "next/server";
import { unsubscribeCommunityMember } from "@/lib/community/member";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: { form: "La solicitud de baja no tiene JSON válido." } },
      { status: 400 },
    );
  }

  const result = await unsubscribeCommunityMember(body);

  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: result.status });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
