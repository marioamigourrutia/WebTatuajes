import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";

export async function POST(request: Request) {
  const status = await getServerAuthStatusFromIdToken(getBearerToken(request));

  if (!status.authenticated) {
    return NextResponse.json(
      { authenticated: false, admin: false, profile: null },
      { status: 401 },
    );
  }

  return NextResponse.json(status);
}
