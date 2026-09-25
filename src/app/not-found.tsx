import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[68vh] w-full max-w-5xl items-center px-4 py-16 sm:px-10">
      <section className="w-full rounded-[2rem] border border-white/10 bg-black/55 p-8 text-center shadow-2xl shadow-black/40 sm:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">Error 404</p>
        <h1 className="mt-4 text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">
          Esta página no existe.
        </h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-zinc-400">
          Vuelve al inicio o continúa con una cotización. Ningún dato de tu solicitud se modifica por llegar a esta pantalla.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link className="rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-zinc-200" href="/">
            Volver al inicio
          </Link>
          <Link className="rounded-full border border-white/20 px-6 py-3 font-semibold text-zinc-100 hover:bg-white/10" href="/quote">
            Ir a cotización
          </Link>
        </div>
      </section>
    </main>
  );
}
