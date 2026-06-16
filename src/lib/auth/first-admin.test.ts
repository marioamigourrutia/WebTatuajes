import { describe, expect, it } from "vitest";
import { createFirstAdminAssignmentPlan, firstAdminConfirmationValue } from "./first-admin";

const serviceAccountJson = JSON.stringify({
  project_id: "webtatuajes-test",
  client_email: "firebase-adminsdk@example.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
});

describe("first admin assignment guard", () => {
  it("requires a real server-only service account and explicit target", () => {
    expect(() =>
      createFirstAdminAssignmentPlan({ serviceAccountJson: "{}", targetUid: "admin-a" }),
    ).toThrow("FIREBASE_SERVICE_ACCOUNT_JSON");
    expect(() => createFirstAdminAssignmentPlan({ serviceAccountJson })).toThrow("FIRST_ADMIN_UID");
  });

  it("allows dry-run planning with exactly one target", () => {
    expect(
      createFirstAdminAssignmentPlan({ serviceAccountJson, targetEmail: "owner@example.com" }),
    ).toEqual({
      dryRun: true,
      target: { email: "owner@example.com" },
    });
  });

  it("rejects ambiguous targets", () => {
    expect(() =>
      createFirstAdminAssignmentPlan({
        serviceAccountJson,
        targetUid: "admin-a",
        targetEmail: "owner@example.com",
      }),
    ).toThrow("exactly one target");
  });

  it("requires explicit confirmation before write mode", () => {
    expect(
      createFirstAdminAssignmentPlan({
        serviceAccountJson,
        targetUid: "admin-a",
        confirmation: firstAdminConfirmationValue,
      }),
    ).toEqual({ dryRun: false, target: { uid: "admin-a" } });
  });
});
