export type FirebaseAdminServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const placeholderServiceAccountValues = new Set(["", "{}", "{ }", "..."]);

type RawServiceAccount = {
  project_id?: unknown;
  client_email?: unknown;
  private_key?: unknown;
};

type FirebaseAdminEnvironment = Record<string, string | undefined>;

function isPlaceholderServiceAccount(value: string): boolean {
  const trimmed = value.trim();

  return (
    placeholderServiceAccountValues.has(trimmed) ||
    trimmed.startsWith("replace-with-") ||
    trimmed.includes("your-")
  );
}

export function parseFirebaseServiceAccountJson(
  serviceAccountJson: string | undefined,
): FirebaseAdminServiceAccount | null {
  if (!serviceAccountJson || isPlaceholderServiceAccount(serviceAccountJson)) {
    return null;
  }

  let parsed: RawServiceAccount;

  try {
    parsed = JSON.parse(serviceAccountJson) as RawServiceAccount;
  } catch {
    return null;
  }

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
    isPlaceholderServiceAccount(projectId) ||
    isPlaceholderServiceAccount(clientEmail) ||
    isPlaceholderServiceAccount(privateKey)
  ) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

export function parseFirebaseSplitServiceAccountEnv(
  env: FirebaseAdminEnvironment,
): FirebaseAdminServiceAccount | null {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  if (
    isPlaceholderServiceAccount(projectId) ||
    isPlaceholderServiceAccount(clientEmail) ||
    isPlaceholderServiceAccount(privateKey)
  ) {
    return null;
  }

  return { projectId, clientEmail, privateKey };
}

export function getFirebaseAdminServiceAccount(): FirebaseAdminServiceAccount | null {
  return (
    parseFirebaseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ??
    parseFirebaseSplitServiceAccountEnv(process.env)
  );
}

export function isFirebaseAdminEmulatorEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST?.trim()) &&
    Boolean(process.env.FIRESTORE_EMULATOR_HOST?.trim())
  );
}

export function isFirebaseAdminBackendConfigured(): boolean {
  return getFirebaseAdminServiceAccount() !== null || isFirebaseAdminEmulatorEnabled();
}

export function getFirebaseAdminProjectId(): string | null {
  const serviceAccount = getFirebaseAdminServiceAccount();

  return serviceAccount?.projectId ?? process.env.FIREBASE_PROJECT_ID ?? null;
}

export function requireFirebaseAdminServiceAccount(): FirebaseAdminServiceAccount {
  const serviceAccount = getFirebaseAdminServiceAccount();

  if (!serviceAccount) {
    throw new Error(
      "Firebase Admin service account is missing, incomplete, or still a placeholder. Set server-only FIREBASE_SERVICE_ACCOUNT_JSON or the complete FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY set.",
    );
  }

  return serviceAccount;
}
