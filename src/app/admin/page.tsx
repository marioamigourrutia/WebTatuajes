import { cookies } from "next/headers";
import { AdminStatusPanel } from "@/lib/auth/admin-status-panel";
import { isFirebaseAdminBackendConfigured } from "@/lib/config/firebase-admin";
import { isExternalImageUploadConfigured } from "@/lib/images/upload-provider";

const adminSessionCookieName = "webtatuajes_admin_session";

const unauthenticatedAdminStatus = {
  authenticated: false,
  admin: false,
  profile: null,
};

export async function getSafeAdminInitialStatus(sessionCookie: string | undefined) {
  if (!isFirebaseAdminBackendConfigured()) {
    return {
      ...unauthenticatedAdminStatus,
      configurationMessage:
        "Firebase Admin is not configured in this environment. Configure server-only FIREBASE_SERVICE_ACCOUNT_JSON or the complete FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY set in Vercel to enable server-side admin validation.",
    };
  }

  try {
    const { getServerAuthStatusFromSessionCookie } = await import("@/lib/auth/server");

    return await getServerAuthStatusFromSessionCookie(sessionCookie);
  } catch {
    return {
      ...unauthenticatedAdminStatus,
      configurationMessage:
        "Firebase Admin could not initialize with the current configuration. Check that Vercel has either valid FIREBASE_SERVICE_ACCOUNT_JSON or the complete FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY set before using the admin panel.",
    };
  }
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const initialStatus = await getSafeAdminInitialStatus(
    cookieStore.get(adminSessionCookieName)?.value,
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-6 py-10">
      <AdminStatusPanel
        imageUploadsEnabled={isExternalImageUploadConfigured()}
        initialStatus={initialStatus}
      />
    </main>
  );
}
