"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="editorial-page py-4 sm:py-5">
      <section className="relative flex min-h-[72vh] items-center justify-center overflow-hidden border border-[#cec6c2]/14 bg-[#370803] p-5 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-[var(--font-display)] text-[clamp(7rem,22vw,20rem)] uppercase leading-[0.7] tracking-[-0.05em] text-[#cec6c2]/[0.07]" aria-hidden="true">
          Error
        </div>
        <div className="relative z-10 max-w-3xl text-center">
          <p className="neo-kicker">Error temporal</p>
          <h1 className="neo-mega mt-6 text-[clamp(4rem,11vw,8.5rem)] text-[#cec6c2]">
            Algo no cargó correctamente.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#b7aaa4]">
            Puedes volver a intentarlo sin recargar todo el sitio. Si estabas completando una cotización, verifica los datos antes de enviarla nuevamente.
          </p>
          <button className="neo-button mt-8" onClick={reset} type="button">
            Intentar nuevamente
          </button>
        </div>
      </section>
    </main>
  );
}
