"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route error", error);
  }, [error]);

  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <section className="border border-[#cec6c2]/14 bg-[#181818] p-5 sm:p-8 lg:p-10">
          <p className="neo-kicker">Administración · recuperación segura</p>
          <h1 className="neo-display mt-5 max-w-5xl text-[clamp(3.2rem,9vw,7rem)] leading-[0.94] text-[#cec6c2]">
            El panel no pudo cargar.
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-[#837f7c] sm:text-base">
            La web pública sigue disponible. Este error puede deberse a una integración de servidor no configurada o a una falla temporal. Reintenta la carga; si continúa, revisa Firebase Admin e ImageKit en Vercel.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button className="neo-button" onClick={() => reset()} type="button">
              Reintentar
            </button>
            <Link className="neo-button-outline" href="/">
              Volver al inicio
            </Link>
          </div>

          {error.digest ? (
            <p className="mt-8 font-mono text-[9px] uppercase tracking-[0.14em] text-[#66615e]">
              Referencia: {error.digest}
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
