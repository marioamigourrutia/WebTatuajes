import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  getFirebaseAuthEmulatorUrl,
  getPublicFirebaseConfig,
  isFirebaseAuthEmulatorEnabled,
} from "@/lib/config/firebase";

let authEmulatorConnected = false;

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

  const auth = getAuth(app);

  if (isFirebaseAuthEmulatorEnabled() && !authEmulatorConnected) {
    connectAuthEmulator(auth, getFirebaseAuthEmulatorUrl(), { disableWarnings: true });
    authEmulatorConnected = true;
  }

  return auth;
}
