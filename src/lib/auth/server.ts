import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "../firebase/admin";
import { type AppRole, type AuthzProfile, isAppRole } from "./roles";

type AuthVerifier = {
  verifyIdToken: (idToken: string, checkRevoked?: boolean) => Promise<DecodedIdToken>;
  verifySessionCookie?: (sessionCookie: string, checkRevoked?: boolean) => Promise<DecodedIdToken>;
  createSessionCookie?: (idToken: string, options: { expiresIn: number }) => Promise<string>;
};

type ProfileReader = (uid: string) => Promise<unknown | null>;

type ServerAuthOptions = {
  auth?: AuthVerifier | null;
  readProfile?: ProfileReader;
};

export const adminSessionCookieName = "webtatuajes_admin_session";
export const adminSessionCookieMaxAgeSeconds = 60 * 60 * 24 * 5;
export const adminSessionCookieExpiresInMs = adminSessionCookieMaxAgeSeconds * 1000;

export type ServerAuthzProfile = AuthzProfile & {
  email: string | null;
};

export type ServerAuthStatus = {
  authenticated: boolean;
  admin: boolean;
  profile: ServerAuthzProfile | null;
};

export function getRoleFromServerProfile(profileData: unknown): AppRole | null {
  if (!profileData || typeof profileData !== "object" || !("role" in profileData)) {
    return null;
  }

  const role = (profileData as { role: unknown }).role;

  return isAppRole(role) ? role : null;
}

async function readProfileFromFirestore(uid: string): Promise<unknown | null> {
  const firestore = getFirebaseAdminFirestore();

  if (!firestore) {
    return null;
  }

  const snapshot = await firestore.doc(`profiles/${uid}`).get();

  return snapshot.exists ? snapshot.data() : null;
}

export async function getServerAuthzProfileFromIdToken(
  idToken: string | undefined,
  options: ServerAuthOptions = {},
): Promise<ServerAuthzProfile | null> {
  if (!idToken?.trim()) {
    return null;
  }

  const auth = options.auth ?? getFirebaseAdminAuth();
  const readProfile = options.readProfile ?? readProfileFromFirestore;

  if (!auth) {
    return null;
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken, true);
    const profileData = await readProfile(decodedToken.uid);
    const role = getRoleFromServerProfile(profileData);

    if (!role) {
      return null;
    }

    return {
      uid: decodedToken.uid,
      email: typeof decodedToken.email === "string" ? decodedToken.email : null,
      emailVerified: decodedToken.email_verified === true,
      role,
    };
  } catch {
    return null;
  }
}

export async function getServerAuthStatusFromIdToken(
  idToken: string | undefined,
  options: ServerAuthOptions = {},
): Promise<ServerAuthStatus> {
  const profile = await getServerAuthzProfileFromIdToken(idToken, options);

  return {
    authenticated: profile !== null,
    admin: profile?.role === "admin",
    profile,
  };
}

async function getServerAuthzProfileFromDecodedToken(
  decodedToken: DecodedIdToken,
  readProfile: ProfileReader,
): Promise<ServerAuthzProfile | null> {
  const profileData = await readProfile(decodedToken.uid);
  const role = getRoleFromServerProfile(profileData);

  if (!role) {
    return null;
  }

  return {
    uid: decodedToken.uid,
    email: typeof decodedToken.email === "string" ? decodedToken.email : null,
    emailVerified: decodedToken.email_verified === true,
    role,
  };
}

export async function createAdminSessionCookieFromIdToken(
  idToken: string | undefined,
  options: ServerAuthOptions = {},
): Promise<
  | { ok: true; sessionCookie: string; profile: ServerAuthzProfile }
  | { ok: false; status: 401 | 403 | 503 }
> {
  const auth = options.auth ?? getFirebaseAdminAuth();

  if (!idToken?.trim()) {
    return { ok: false, status: 401 };
  }

  if (!auth?.createSessionCookie) {
    return { ok: false, status: 503 };
  }

  const profile = await getServerAuthzProfileFromIdToken(idToken, options);

  if (!profile) {
    return { ok: false, status: 401 };
  }

  if (profile.role !== "admin") {
    return { ok: false, status: 403 };
  }

  try {
    return {
      ok: true,
      profile,
      sessionCookie: await auth.createSessionCookie(idToken, {
        expiresIn: adminSessionCookieExpiresInMs,
      }),
    };
  } catch {
    return { ok: false, status: 401 };
  }
}

export async function getServerAuthStatusFromSessionCookie(
  sessionCookie: string | undefined,
  options: ServerAuthOptions = {},
): Promise<ServerAuthStatus> {
  const auth = options.auth ?? getFirebaseAdminAuth();
  const readProfile = options.readProfile ?? readProfileFromFirestore;

  if (!sessionCookie?.trim() || !auth?.verifySessionCookie) {
    return { authenticated: false, admin: false, profile: null };
  }

  try {
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    const profile = await getServerAuthzProfileFromDecodedToken(decodedToken, readProfile);

    return {
      authenticated: profile !== null,
      admin: profile?.role === "admin",
      profile,
    };
  } catch {
    return { authenticated: false, admin: false, profile: null };
  }
}
