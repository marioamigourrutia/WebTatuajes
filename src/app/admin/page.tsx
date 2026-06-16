import { AdminStatusPanel } from "@/lib/auth/admin-status-panel";

export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-10">
      <AdminStatusPanel />
    </main>
  );
}
