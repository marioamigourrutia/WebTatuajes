export default function Loading() {
  return (
    <main className="editorial-page py-4 sm:py-5">
      <section className="min-h-[70vh] border border-[#cec6c2]/14 bg-[#181818] p-5 sm:p-8">
        <div className="animate-pulse">
          <div className="h-2 w-28 bg-[#837f7c]/40" />
          <div className="mt-8 h-28 w-[85%] max-w-5xl bg-[#cec6c2]/10 sm:h-44" />
          <div className="mt-4 h-28 w-[62%] max-w-3xl bg-[#cec6c2]/10 sm:h-44" />
          <div className="mt-10 grid border border-[#cec6c2]/10 sm:grid-cols-3">
            <div className="h-32 border-b border-[#cec6c2]/10 bg-[#202020] sm:border-b-0 sm:border-r" />
            <div className="h-32 border-b border-[#cec6c2]/10 bg-[#202020] sm:border-b-0 sm:border-r" />
            <div className="h-32 bg-[#202020]" />
          </div>
        </div>
      </section>
    </main>
  );
}
