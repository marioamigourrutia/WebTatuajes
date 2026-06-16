import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { assertLocalAdminSeedEnvironment, localDemoProjectId } from "./local-admin-seed-guard.mjs";

const adminEmail = process.env.LOCAL_ADMIN_EMAIL || "admin@example.test";
const adminPassword = process.env.LOCAL_ADMIN_PASSWORD || "Password123!";

async function upsertUser(auth) {
  try {
    const existing = await auth.getUserByEmail(adminEmail);
    await auth.updateUser(existing.uid, { password: adminPassword, emailVerified: true });
    return existing.uid;
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }

    const created = await auth.createUser({
      email: adminEmail,
      password: adminPassword,
      emailVerified: true,
    });
    return created.uid;
  }
}

async function main() {
  assertLocalAdminSeedEnvironment();
  const app = initializeApp({ projectId: localDemoProjectId });
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const uid = await upsertUser(auth);

  await firestore.doc(`profiles/${uid}`).set(
    {
      email: adminEmail,
      role: "admin",
      seeded_local_admin: true,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await auth.setCustomUserClaims(uid, { role: "admin" });

  console.log("Local admin seeded in Firebase emulators only.");
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`UID: ${uid}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
