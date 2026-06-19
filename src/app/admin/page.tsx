import { cookies } from "next/headers";
import { AdminStatusPanel } from "@/lib/auth/admin-status-panel";
import { adminSessionCookieName, getServerAuthStatusFromSessionCookie } from "@/lib/auth/server";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const initialStatus = await getServerAuthStatusFromSessionCookie(
    cookieStore.get(adminSessionCookieName)?.value,
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-6 py-10">
      <AdminStatusPanel initialStatus={initialStatus} />
    </main>
  );
}
