import { FieldValue } from "firebase-admin/firestore";
import { isFirebaseAdminBackendConfigured } from "@/lib/config/firebase-admin";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import {
  cleanSponsorString,
  isValidSponsorId,
  mapFirestoreSponsor,
  mapSponsorToFirestore,
  validateSponsorInput,
  type Sponsor,
} from "./sponsor";

type FirestoreLike = NonNullable<ReturnType<typeof getFirebaseAdminFirestore>>;

export async function createSponsor(input: unknown, firestore = getFirebaseAdminFirestore()) {
  const validation = validateSponsorInput(input);

  if (!validation.ok) return { ok: false as const, status: 400, errors: validation.errors };
  if (!firestore) {
    return {
      ok: false as const,
      status: 503,
      errors: { form: "Firebase Admin no está configurado." },
    };
  }

  const reference = firestore.collection("sponsors").doc();

  await reference.set({
    ...mapSponsorToFirestore(validation.value),
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  return { ok: true as const, id: reference.id };
}

export async function updateSponsor(firestore: FirestoreLike, sponsorId: unknown, input: unknown) {
  const cleanSponsorId = cleanSponsorString(sponsorId);

  if (!isValidSponsorId(cleanSponsorId)) {
    return {
      ok: false as const,
      status: 400,
      errors: { sponsorId: "ID de colaborador inválido." },
    };
  }

  const validation = validateSponsorInput(input);

  if (!validation.ok) return { ok: false as const, status: 400, errors: validation.errors };

  const reference = firestore.collection("sponsors").doc(cleanSponsorId);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    return { ok: false as const, status: 404, errors: { sponsorId: "El colaborador no existe." } };
  }

  await reference.update({
    ...mapSponsorToFirestore(validation.value),
    updated_at: FieldValue.serverTimestamp(),
  });

  return { ok: true as const, id: cleanSponsorId };
}

export async function deleteSponsor(firestore: FirestoreLike, sponsorId: unknown) {
  const cleanSponsorId = cleanSponsorString(sponsorId);

  if (!isValidSponsorId(cleanSponsorId)) {
    return { ok: false as const, status: 400, error: "ID de colaborador inválido." };
  }

  const reference = firestore.collection("sponsors").doc(cleanSponsorId);
  const snapshot = await reference.get();

  if (!snapshot.exists) {
    return { ok: false as const, status: 404, error: "El colaborador no existe." };
  }

  await reference.delete();

  return { ok: true as const, id: cleanSponsorId };
}

export async function listAdminSponsors(firestore: FirestoreLike, limit = 50): Promise<Sponsor[]> {
  const snapshot = await firestore.collection("sponsors").get();

  return snapshot.docs
    .map((document) => mapFirestoreSponsor(document))
    .sort(
      (first, second) =>
        first.sortOrder - second.sortOrder || first.name.localeCompare(second.name, "es-CL"),
    )
    .slice(0, limit);
}

export async function listPublicSponsors(
  firestore?: FirestoreLike | null,
  limit = 12,
): Promise<Sponsor[]> {
  try {
    if (firestore === undefined && !isFirebaseAdminBackendConfigured()) return [];

    const sponsorFirestore = firestore ?? getFirebaseAdminFirestore();

    if (!sponsorFirestore) return [];

    const snapshot = await sponsorFirestore
      .collection("sponsors")
      .where("active", "==", true)
      .get();

    return snapshot.docs
      .map((document) => mapFirestoreSponsor(document))
      .sort(
        (first, second) =>
          first.sortOrder - second.sortOrder || first.name.localeCompare(second.name, "es-CL"),
      )
      .slice(0, limit);
  } catch {
    return [];
  }
}
