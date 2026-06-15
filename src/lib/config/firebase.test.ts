import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicFirebaseConfig, requirePublicFirebaseConfig } from "./firebase";

describe("firebase public configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when placeholder values are still configured", () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "your-firebase-api-key");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "your-project.firebaseapp.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "your-firebase-project-id");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "your-project.appspot.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "your-messaging-sender-id");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "your-firebase-app-id");

    expect(getPublicFirebaseConfig()).toBeNull();
  });

  it("returns null when required Firebase values are missing", () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "firebase-api-key");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "example.firebaseapp.com");

    expect(getPublicFirebaseConfig()).toBeNull();
  });

  it("returns public config when required values are present", () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "firebase-api-key");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "example.firebaseapp.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "example-project");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "example.appspot.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", "123456789");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "1:123456789:web:abcdef");

    expect(getPublicFirebaseConfig()).toEqual({
      apiKey: "firebase-api-key",
      authDomain: "example.firebaseapp.com",
      projectId: "example-project",
      storageBucket: "example.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef",
    });
  });

  it("throws a clear setup error when required config is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "");

    expect(() => requirePublicFirebaseConfig()).toThrow("Firebase public configuration is missing");
  });
});
