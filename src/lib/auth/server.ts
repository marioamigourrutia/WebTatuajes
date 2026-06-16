import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from "../firebase/admin";
import { type AppRole, type AuthzProfile, isAppRole } from "./roles";

type AuthVerifier = {
  verifyIdToken: (idToken: string, checkRevoked?: boolean) => Promise<DecodedIdToken>;
};

type ProfileReader = (uid: string) => Promise<unknown | null>;

type ServerAuthOptions = {
  auth?: AuthVerifier | null;
  readProfile?: ProfileReader;
};

export type ServerAuthzProfile = AuthzProfile & {
  email: string | null;
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
}
