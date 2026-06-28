import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";

export type CommunityMemberInput = {
  fullName: string;
  email: string;
  marketingConsent: true;
};

export type RecentCommunityMember = {
  id: string;
  fullName: string;
  email: string;
  active: boolean;
  origin: string;
  sourcePath: string;
  createdAt: string | null;
  consentRecordedAt: string | null;
};

type FirestoreLike = NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>;

const maxLengths = {
  fullName: 80,
  email: 160,
};

const communityMemberConstants = {
  origin: "homepage_community_form",
  sourcePath: "/",
} as const;

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function normalizeEmail(value: unknown): string {
  return cleanString(value).toLowerCase();
}

function isChecked(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function serializeDate(value: unknown): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return null;
}

export function validateCommunityMemberInput(
  input: unknown,
): { ok: true; value: CommunityMemberInput } | { ok: false; errors: Record<string, string> } {
  const data = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const fullName = cleanString(data.fullName);
  const email = normalizeEmail(data.email);
  const marketingConsent = isChecked(data.marketingConsent);
  const errors: Record<string, string> = {};

  if (!fullName) errors.fullName = "Ingresa tu nombre completo.";
  else if (fullName.length > maxLengths.fullName) errors.fullName = "El nombre es demasiado largo.";

  if (!email) errors.email = "Ingresa tu email.";
  else if (email.length > maxLengths.email) errors.email = "El email es demasiado largo.";
  else if (!isValidEmail(email)) errors.email = "Ingresa un email válido.";

  if (!marketingConsent) {
    errors.marketingConsent = "Debes aceptar recibir novedades de la comunidad.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: { fullName, email, marketingConsent: true } };
}

export function mapCommunityMemberToFirestore(input: CommunityMemberInput) {
  return {
    full_name: input.fullName,
    email: input.email,
    marketing_consent: true,
    consent_recorded_at: FieldValue.serverTimestamp(),
    origin: communityMemberConstants.origin,
    source_path: communityMemberConstants.sourcePath,
    active: true,
  };
}

export function getCommunityMemberDocumentId(email: string): string {
  const digest = createHash("sha256").update(email).digest("hex");

  return `email_sha256_${digest}`;
}

export async function createCommunityMember(
  input: unknown,
  firestore = getFirebaseAdminFirestore(),
) {
  const validation = validateCommunityMemberInput(input);

  if (!validation.ok) {
    return { ok: false as const, status: 400, errors: validation.errors };
  }

  if (!firestore) {
    return {
      ok: false as const,
      status: 503,
      errors: { form: "Firebase Admin no está configurado para guardar la inscripción." },
    };
  }

  const documentId = getCommunityMemberDocumentId(validation.value.email);

  await firestore
    .collection("community_members")
    .doc(documentId)
    .set(
      {
        ...mapCommunityMemberToFirestore(validation.value),
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return { ok: true as const };
}

export async function listRecentCommunityMembers(firestore: FirestoreLike, limit = 10) {
  const snapshot = await firestore
    .collection("community_members")
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((document): RecentCommunityMember => {
    const data = document.data();

    return {
      id: document.id,
      fullName: cleanString(data.full_name) || "Sin nombre",
      email: normalizeEmail(data.email),
      active: data.active === true,
      origin: cleanString(data.origin) || communityMemberConstants.origin,
      sourcePath: cleanString(data.source_path) || communityMemberConstants.sourcePath,
      createdAt: serializeDate(data.created_at),
      consentRecordedAt: serializeDate(data.consent_recorded_at),
    };
  });
}
