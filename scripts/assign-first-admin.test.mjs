import { describe, expect, it } from "vitest";
import { parseFirstAdminServiceAccount } from "./assign-first-admin.mjs";

const serviceAccountJson = JSON.stringify({
  project_id: "webtatuajes-test",
  client_email: "firebase-adminsdk@example.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
});

describe("assign first admin script credentials", () => {
  it("accepts JSON Firebase Admin credentials", () => {
    expect(
      parseFirstAdminServiceAccount({ FIREBASE_SERVICE_ACCOUNT_JSON: serviceAccountJson }),
    ).toEqual({
      projectId: "webtatuajes-test",
      clientEmail: "firebase-adminsdk@example.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
    });
  });

  it("accepts complete split Firebase Admin credentials", () => {
    expect(
      parseFirstAdminServiceAccount({
        FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
        FIREBASE_PROJECT_ID: "webtatuajes-test",
        FIREBASE_CLIENT_EMAIL: "firebase-adminsdk@example.iam.gserviceaccount.com",
        FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
      }),
    ).toEqual({
      projectId: "webtatuajes-test",
      clientEmail: "firebase-adminsdk@example.iam.gserviceaccount.com",
      privateKey: "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
    });
  });

  it("rejects incomplete or placeholder Firebase Admin credentials", () => {
    expect(() =>
      parseFirstAdminServiceAccount({
        FIREBASE_PROJECT_ID: "webtatuajes-test",
        FIREBASE_CLIENT_EMAIL: "firebase-adminsdk@example.iam.gserviceaccount.com",
      }),
    ).toThrow("Firebase Admin credentials");

    expect(() =>
      parseFirstAdminServiceAccount({
        FIREBASE_PROJECT_ID: "your-project-id",
        FIREBASE_CLIENT_EMAIL: "firebase-adminsdk@example.iam.gserviceaccount.com",
        FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
      }),
    ).toThrow("Firebase Admin credentials");

    expect(() =>
      parseFirstAdminServiceAccount({
        FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
          project_id: "...",
          client_email: "firebase-adminsdk@example.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
        }),
      }),
    ).toThrow("Firebase Admin credentials");

    expect(() =>
      parseFirstAdminServiceAccount({
        FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
          project_id: "replace-with-project-id",
          client_email: "firebase-adminsdk@example.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
        }),
      }),
    ).toThrow("Firebase Admin credentials");

    expect(() =>
      parseFirstAdminServiceAccount({
        FIREBASE_PROJECT_ID: "...",
        FIREBASE_CLIENT_EMAIL: "firebase-adminsdk@example.iam.gserviceaccount.com",
        FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
      }),
    ).toThrow("Firebase Admin credentials");

    expect(() =>
      parseFirstAdminServiceAccount({
        FIREBASE_PROJECT_ID: "replace-with-project-id",
        FIREBASE_CLIENT_EMAIL: "firebase-adminsdk@example.iam.gserviceaccount.com",
        FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
      }),
    ).toThrow("Firebase Admin credentials");
  });
});
