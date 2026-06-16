import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const confirmationValue = "assign-first-admin";

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!raw || raw.trim() === "{}" || raw.includes("your-")) {
    throw new Error(
      "Set a real server-only FIREBASE_SERVICE_ACCOUNT_JSON before running this script.",
    );
  }

  const parsed = JSON.parse(raw);

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON must include project_id, client_email, and private_key.",
    );
  }

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
  };
}

async function resolveTargetUid(auth) {
  const targetUid = process.env.FIRST_ADMIN_UID?.trim();
  const targetEmail = process.env.FIRST_ADMIN_EMAIL?.trim();

  if (!targetUid && !targetEmail) {
    throw new Error("Set exactly one target: FIRST_ADMIN_UID or FIRST_ADMIN_EMAIL.");
  }

  if (targetUid && targetEmail) {
    throw new Error("Use exactly one target, not both FIRST_ADMIN_UID and FIRST_ADMIN_EMAIL.");
  }

  if (targetUid) {
    return targetUid;
  }

  const user = await auth.getUserByEmail(targetEmail);

  return user.uid;
}

async function main() {
  const serviceAccount = parseServiceAccount();
  const dryRun = process.env.FIREBASE_ADMIN_CONFIRM_ASSIGNMENT !== confirmationValue;

  if (getApps().length === 0) {
    initializeApp({ credential: cert(serviceAccount) });
  }

  const auth = getAuth();
  const firestore = getFirestore();
  const uid = await resolveTargetUid(auth);
  const profileRef = firestore.doc(`profiles/${uid}`);
  const profileSnapshot = await profileRef.get();
  const existingRole = profileSnapshot.exists ? profileSnapshot.data()?.role : null;

  console.log(`Target UID: ${uid}`);
  console.log(`Existing profile role: ${existingRole ?? "none"}`);
  console.log(`Dry run: ${dryRun ? "yes" : "no"}`);

  if (dryRun) {
    console.log(
      `No writes performed. Set FIREBASE_ADMIN_CONFIRM_ASSIGNMENT=${confirmationValue} to assign admin.`,
    );
    return;
  }

  await profileRef.set(
    {
      role: "admin",
      updated_at: FieldValue.serverTimestamp(),
      first_admin_assigned_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await auth.setCustomUserClaims(uid, { role: "admin" });
  console.log("First admin assignment completed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
