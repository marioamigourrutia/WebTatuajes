export const localDemoProjectId = "demo-webtatuajes";

export function assertLocalAdminSeedEnvironment(env = process.env) {
  const projectId = env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const authHost = env.FIREBASE_AUTH_EMULATOR_HOST;
  const firestoreHost = env.FIRESTORE_EMULATOR_HOST;

  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to seed local admin while NODE_ENV=production.");
  }

  if (env.FIREBASE_SERVICE_ACCOUNT_JSON && env.FIREBASE_SERVICE_ACCOUNT_JSON !== "{}") {
    throw new Error("Refusing to seed local admin with FIREBASE_SERVICE_ACCOUNT_JSON set.");
  }

  if (projectId !== localDemoProjectId) {
    throw new Error(
      `Refusing to seed project '${projectId ?? "missing"}'. Use ${localDemoProjectId}.`,
    );
  }

  if (authHost !== "127.0.0.1:9099" && authHost !== "localhost:9099") {
    throw new Error("FIREBASE_AUTH_EMULATOR_HOST must point to the local Auth emulator.");
  }

  if (firestoreHost !== "127.0.0.1:8080" && firestoreHost !== "localhost:8080") {
    throw new Error("FIRESTORE_EMULATOR_HOST must point to the local Firestore emulator.");
  }
}
