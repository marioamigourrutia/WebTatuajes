import { NextResponse } from "next/server";
import { getServerAuthStatusFromIdToken } from "@/lib/auth/server";

function getBearerToken(request: Request): string | undefined {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  return authorization.slice("Bearer ".length).trim();
}

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
