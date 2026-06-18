import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
  getFirebaseAdminProjectId,
  getFirebaseAdminServiceAccount,
  isFirebaseAdminEmulatorEnabled,
} from "../config/firebase-admin";

function getFirebaseAdminStorageEmulatorHost(): string | null {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST?.trim()) {
    return process.env.FIREBASE_STORAGE_EMULATOR_HOST.trim();
  }

  return isFirebaseAdminEmulatorEnabled() ? "127.0.0.1:9199" : null;
}

function configureFirebaseAdminStorageEmulator() {
  const emulatorHost = getFirebaseAdminStorageEmulatorHost();

  if (!emulatorHost || process.env.STORAGE_EMULATOR_HOST) {
    return;
  }

  process.env.STORAGE_EMULATOR_HOST = emulatorHost.startsWith("http")
    ? emulatorHost
    : `http://${emulatorHost}`;
}

export function getFirebaseAdminApp(): App | null {
  const serviceAccount = getFirebaseAdminServiceAccount();
  const projectId = getFirebaseAdminProjectId();

  if (!serviceAccount && !isFirebaseAdminEmulatorEnabled()) {
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  if (serviceAccount) {
    return initializeApp({
      credential: cert({
        projectId: serviceAccount.projectId,
        clientEmail: serviceAccount.clientEmail,
        privateKey: serviceAccount.privateKey,
      }),
      storageBucket: getFirebaseAdminStorageBucketName() ?? undefined,
    });
  }

  return initializeApp({
    projectId: projectId ?? "demo-webtatuajes",
    storageBucket: getFirebaseAdminStorageBucketName() ?? undefined,
  });
}

export function getFirebaseAdminAuth(): Auth | null {
  const app = getFirebaseAdminApp();

  return app ? getAuth(app) : null;
}

export function getFirebaseAdminFirestore(): Firestore | null {
  const app = getFirebaseAdminApp();

  return app ? getFirestore(app) : null;
}

export function getFirebaseAdminStorageBucketName(): string | null {
  return (
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    (process.env.FIREBASE_PROJECT_ID ? `${process.env.FIREBASE_PROJECT_ID}.appspot.com` : null)
  );
}

export function getFirebaseAdminStorageBucket() {
  configureFirebaseAdminStorageEmulator();

  const app = getFirebaseAdminApp();
  const bucketName = getFirebaseAdminStorageBucketName();

  return app && bucketName ? getStorage(app).bucket(bucketName) : null;
}
