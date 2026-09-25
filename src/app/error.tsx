"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[68vh] w-full max-w-5xl items-center px-4 py-16 sm:px-10">
      <section className="w-full rounded-[2rem] border border-white/10 bg-black/60 p-8 text-center shadow-2xl shadow-black/40 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Error temporal</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">Algo no cargó correctamente.</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-400">
          Puedes volver a intentarlo sin recargar todo el sitio. Si estabas completando una cotización, verifica los datos antes de enviarla nuevamente.
        </p>
        <button className="mt-8 rounded-full bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200" onClick={reset} type="button">
          Intentar nuevamente
        </button>
      </section>
    </main>
  );
}
