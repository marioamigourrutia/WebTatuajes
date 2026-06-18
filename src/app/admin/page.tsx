import { AdminStatusPanel } from "@/lib/auth/admin-status-panel";

export default function AdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col px-6 py-10">
      <AdminStatusPanel />
    </main>
  );
}
