import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFirebaseAdminProjectId,
  isFirebaseAdminEmulatorEnabled,
  parseFirebaseServiceAccountJson,
} from "./firebase-admin";

const validServiceAccount = JSON.stringify({
  project_id: "webtatuajes-test",
  client_email: "firebase-adminsdk@example.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
});

describe("firebase admin configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects missing and placeholder service account values", () => {
    expect(parseFirebaseServiceAccountJson(undefined)).toBeNull();
    expect(parseFirebaseServiceAccountJson("{}")).toBeNull();
    expect(parseFirebaseServiceAccountJson("your-service-account-json")).toBeNull();
  });

  it("rejects invalid or incomplete service account JSON", () => {
    expect(parseFirebaseServiceAccountJson("not-json")).toBeNull();
    expect(parseFirebaseServiceAccountJson(JSON.stringify({ project_id: "demo" }))).toBeNull();
  });

  it("normalizes a valid service account without exposing secrets", () => {
    expect(parseFirebaseServiceAccountJson(validServiceAccount)).toEqual({
      projectId: "webtatuajes-test",
      clientEmail: "firebase-adminsdk@example.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
    });
  });

  it("allows Admin SDK emulator mode only outside production with both emulator hosts", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");
    vi.stubEnv("FIREBASE_PROJECT_ID", "demo-webtatuajes");

    expect(isFirebaseAdminEmulatorEnabled()).toBe(true);
    expect(getFirebaseAdminProjectId()).toBe("demo-webtatuajes");
  });

  it("does not allow Admin SDK emulator mode in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", "127.0.0.1:8080");

    expect(isFirebaseAdminEmulatorEnabled()).toBe(false);
  });
});
