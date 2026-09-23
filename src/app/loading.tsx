export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-10">
      <div className="animate-pulse space-y-5 rounded-[2rem] border border-white/10 bg-black/45 p-8 shadow-2xl shadow-black/30">
        <div className="h-3 w-32 rounded-full bg-zinc-800" />
        <div className="h-12 max-w-2xl rounded-2xl bg-zinc-800" />
        <div className="h-5 max-w-xl rounded-full bg-zinc-900" />
        <div className="grid gap-4 pt-6 sm:grid-cols-3">
          <div className="h-28 rounded-3xl bg-zinc-900" />
          <div className="h-28 rounded-3xl bg-zinc-900" />
          <div className="h-28 rounded-3xl bg-zinc-900" />
        </div>
      </div>
    </main>
  );
}
