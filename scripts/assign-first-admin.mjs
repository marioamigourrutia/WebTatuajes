import { pathToFileURL } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const confirmationValue = "assign-first-admin";

function isPlaceholderCredential(value) {
  const trimmed = value.trim();

  return (
    trimmed === "" ||
    trimmed === "{}" ||
    trimmed === "{ }" ||
    trimmed === "..." ||
    trimmed.startsWith("replace-with-") ||
    trimmed.includes("your-")
  );
}

function parseServiceAccountJson(raw) {
  if (!raw || isPlaceholderCredential(raw)) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (
      typeof parsed.project_id !== "string" ||
      typeof parsed.client_email !== "string" ||
      typeof parsed.private_key !== "string"
    ) {
      return null;
    }

    const projectId = parsed.project_id.trim();
    const clientEmail = parsed.client_email.trim();
    const privateKey = parsed.private_key.replace(/\\n/g, "\n").trim();

    if (
      isPlaceholderCredential(projectId) ||
      isPlaceholderCredential(clientEmail) ||
      isPlaceholderCredential(privateKey)
    ) {
      return null;
    }

    return { projectId, clientEmail, privateKey };
  } catch {
    return null;
  }
}

function parseSplitServiceAccountEnv(env) {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (
    isPlaceholderCredential(projectId) ||
    isPlaceholderCredential(clientEmail) ||
    isPlaceholderCredential(privateKey)
  ) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

export function parseFirstAdminServiceAccount(env = process.env) {
  const serviceAccount =
    parseServiceAccountJson(env.FIREBASE_SERVICE_ACCOUNT_JSON) ?? parseSplitServiceAccountEnv(env);

  if (!serviceAccount) {
    throw new Error(
      "Set real server-only Firebase Admin credentials before running this script: FIREBASE_SERVICE_ACCOUNT_JSON or the complete FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY set.",
    );
  }

  return serviceAccount;
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
  const serviceAccount = parseFirstAdminServiceAccount();
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
