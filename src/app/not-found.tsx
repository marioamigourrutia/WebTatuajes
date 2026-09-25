import Link from "next/link";

export default function NotFound() {
  return (
    <main className="editorial-page py-4 sm:py-5">
      <section className="relative flex min-h-[72vh] items-center justify-center overflow-hidden border border-[#cec6c2]/14 bg-[#101010] p-5 sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-[var(--font-display)] text-[clamp(10rem,30vw,28rem)] uppercase leading-[0.7] tracking-[-0.05em] text-[#cec6c2]/[0.06]" aria-hidden="true">
          404
        </div>
        <div className="relative z-10 max-w-3xl text-center">
          <p className="neo-kicker">Error 404</p>
          <h1 className="neo-mega mt-6 text-[clamp(4.2rem,12vw,9rem)] text-[#cec6c2]">
            Esta página no existe.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#837f7c]">
            Vuelve al inicio o continúa con una cotización. Ningún dato de tu solicitud se modifica por llegar a esta pantalla.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="neo-button" href="/">Volver al inicio</Link>
            <Link className="neo-button-outline" href="/quote">Ir a cotización</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
