import { getFirebaseAdminAuth } from "@/lib/firebase/admin";

export type VerifiedCustomerIdentity = {
  uid: string;
  email: string;
  emailVerified: true;
};

export type CustomerTokenVerificationResult =
  | { ok: true; customer: VerifiedCustomerIdentity }
  | { ok: false; status: 401 | 403 | 503; errors: Record<string, string> };

export async function verifyCustomerIdToken(
  idToken: string | undefined,
): Promise<CustomerTokenVerificationResult> {
  if (!idToken) {
    return {
      ok: false,
      status: 401,
      errors: { form: "Debes verificar tu email antes de enviar la cotización." },
    };
  }

  const auth = getFirebaseAdminAuth();

  if (!auth) {
    return {
      ok: false,
      status: 503,
      errors: { form: "Firebase Admin no está configurado." },
    };
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const email =
      typeof decodedToken.email === "string" ? decodedToken.email.trim().toLowerCase() : "";

    if (!email || decodedToken.email_verified !== true) {
      return {
        ok: false,
        status: 403,
        errors: { email: "Debes usar un email verificado para enviar la cotización." },
      };
    }

    return {
      ok: true,
      customer: { uid: decodedToken.uid, email, emailVerified: true },
    };
  } catch {
    return {
      ok: false,
      status: 401,
      errors: { form: "La verificación de email expiró o no es válida. Solicita un nuevo enlace." },
    };
  }
}
