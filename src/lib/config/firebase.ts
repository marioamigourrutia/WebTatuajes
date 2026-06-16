type PublicFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const placeholderValues = new Set([
  "",
  "your-firebase-api-key",
  "your-project.firebaseapp.com",
  "your-firebase-project-id",
  "your-project.appspot.com",
  "your-messaging-sender-id",
  "your-firebase-app-id",
]);

function hasPlaceholderValue(values: string[]): boolean {
  return values.some((value) => placeholderValues.has(value));
}

export function getPublicFirebaseConfig(): PublicFirebaseConfig | null {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  } satisfies PublicFirebaseConfig;

  if (hasPlaceholderValue(Object.values(config))) {
    return null;
  }

  return config;
}

export function requirePublicFirebaseConfig(): PublicFirebaseConfig {
  const config = getPublicFirebaseConfig();

  if (!config) {
    throw new Error(
      "Firebase public configuration is missing. Set NEXT_PUBLIC_FIREBASE_* values before enabling Firebase features.",
    );
  }

  return config;
}

export function isFirebaseAuthEmulatorEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_ENABLED === "true"
  );
}

export function getFirebaseAuthEmulatorUrl(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL || "http://127.0.0.1:9099";
}

export function getFirebaseDemoProjectId(): string {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-webtatuajes";
}
