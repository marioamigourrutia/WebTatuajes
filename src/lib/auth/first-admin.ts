import {
  parseFirebaseServiceAccountJson,
  parseFirebaseSplitServiceAccountEnv,
} from "../config/firebase-admin";

export const firstAdminConfirmationValue = "assign-first-admin";

type FirstAdminAssignmentInput = {
  serviceAccountJson?: string;
  firebaseProjectId?: string;
  firebaseClientEmail?: string;
  firebasePrivateKey?: string;
  targetUid?: string;
  targetEmail?: string;
  confirmation?: string;
  dryRun?: boolean;
};

export type FirstAdminAssignmentPlan = {
  dryRun: boolean;
  target: { uid?: string; email?: string };
};

export function createFirstAdminAssignmentPlan(
  input: FirstAdminAssignmentInput,
): FirstAdminAssignmentPlan {
  const serviceAccount =
    parseFirebaseServiceAccountJson(input.serviceAccountJson) ??
    parseFirebaseSplitServiceAccountEnv({
      FIREBASE_PROJECT_ID: input.firebaseProjectId,
      FIREBASE_CLIENT_EMAIL: input.firebaseClientEmail,
      FIREBASE_PRIVATE_KEY: input.firebasePrivateKey,
    });

  if (!serviceAccount) {
    throw new Error(
      "Valid server-only Firebase Admin credentials are required: FIREBASE_SERVICE_ACCOUNT_JSON or the complete FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY set.",
    );
  }

  const targetUid = input.targetUid?.trim();
  const targetEmail = input.targetEmail?.trim();

  if (!targetUid && !targetEmail) {
    throw new Error("FIRST_ADMIN_UID or FIRST_ADMIN_EMAIL is required.");
  }

  if (targetUid && targetEmail) {
    throw new Error("Use exactly one target: FIRST_ADMIN_UID or FIRST_ADMIN_EMAIL.");
  }

  const dryRun = input.dryRun ?? input.confirmation !== firstAdminConfirmationValue;

  if (!dryRun && input.confirmation !== firstAdminConfirmationValue) {
    throw new Error(
      `Set FIREBASE_ADMIN_CONFIRM_ASSIGNMENT=${firstAdminConfirmationValue} to write.`,
    );
  }

  return {
    dryRun,
    target: targetUid ? { uid: targetUid } : { email: targetEmail },
  };
}
