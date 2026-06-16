import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getPublicFirebaseConfig } from "@/lib/config/firebase";

export function getFirebaseClientApp(): FirebaseApp | null {
  const config = getPublicFirebaseConfig();

  if (!config) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(config);
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseClientApp();

  if (!app) {
    return null;
  }

  return getAuth(app);
}
