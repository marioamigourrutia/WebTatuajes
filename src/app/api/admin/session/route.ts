import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import {
  adminSessionCookieMaxAgeSeconds,
  adminSessionCookieName,
  createAdminSessionCookieFromIdToken,
} from "@/lib/auth/server";

function applyAdminSessionCookie(response: NextResponse, sessionCookie: string) {
  response.cookies.set({
    name: adminSessionCookieName,
    value: sessionCookie,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionCookieMaxAgeSeconds,
  });
}

function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: adminSessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function POST(request: Request) {
  const result = await createAdminSessionCookieFromIdToken(getBearerToken(request));

  if (!result.ok) {
    if (result.status === 403) {
      return NextResponse.json(
        { error: "Se requiere rol admin validado en servidor." },
        { status: 403 },
      );
    }

    if (result.status === 503) {
      return NextResponse.json({ error: "Firebase Admin no está configurado." }, { status: 503 });
    }

    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const response = NextResponse.json({
    authenticated: true,
    admin: true,
    profile: result.profile,
  });
  applyAdminSessionCookie(response, result.sessionCookie);

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false, admin: false, profile: null });
  clearAdminSessionCookie(response);

  return response;
}
