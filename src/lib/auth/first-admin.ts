import { parseFirebaseServiceAccountJson } from "../config/firebase-admin";

export const firstAdminConfirmationValue = "assign-first-admin";

type FirstAdminAssignmentInput = {
  serviceAccountJson?: string;
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
  const serviceAccount = parseFirebaseServiceAccountJson(input.serviceAccountJson);

  if (!serviceAccount) {
    throw new Error("A valid server-only FIREBASE_SERVICE_ACCOUNT_JSON is required.");
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
