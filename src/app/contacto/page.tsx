import type { Metadata } from "next";
import {
  contactHighlights,
  contactLinks,
  supportExpectations,
  visitExpectations,
} from "@/lib/contact/public-contact";

export const metadata: Metadata = {
  title: "Contacto y ubicación",
  description:
    "Información de contacto, ubicación por reserva, atención por agenda, higiene y soporte posterior para cotizar tatuajes en Chile.",
};

export default function ContactPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-10">
      <section className="relative space-y-6 overflow-hidden rounded-[2rem] border border-amber-100/10 bg-stone-950/55 p-6 py-12 shadow-2xl shadow-black/25 sm:p-8 sm:py-14">
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">
          Contacto y ubicación · WhatsApp +56 9 7761 6917
        </p>
        <h1 className="max-w-4xl text-5xl font-black leading-tight text-stone-50 sm:text-7xl">
          Coordinemos tu próxima pieza con información clara.
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-stone-300">
          Trabajamos por agenda y revisamos cada solicitud antes de confirmar una sesión. La
          ubicación e indicaciones finales se comparten cuando el proyecto queda evaluado y la cita
          está coordinada.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <a
            className="rounded-full bg-amber-300 px-6 py-3 text-center font-semibold text-stone-950 transition hover:bg-amber-200"
            href="/quote"
          >
            Solicitar cotización
          </a>
          <a
            className="rounded-full border border-amber-300/40 bg-stone-950/40 px-6 py-3 text-center font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
            href="/servicios"
          >
            Revisar servicios
          </a>
        </div>
      </section>

      <section
        className="grid min-w-0 gap-4 py-8 md:grid-cols-3"
        aria-labelledby="contact-intent-heading"
      >
        <div className="md:col-span-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
            Cómo contactarnos
          </p>
          <h2 id="contact-intent-heading" className="mt-3 text-3xl font-black text-stone-50">
            El primer paso es una cotización bien preparada.
          </h2>
        </div>
        {contactHighlights.map((item) => (
          <article
            className="min-w-0 rounded-3xl border border-stone-800 bg-stone-950/70 p-5 shadow-xl shadow-black/15 transition hover:border-amber-300/40"
            key={item.title}
          >
            <h3 className="text-xl font-black text-stone-50">{item.title}</h3>
            <p className="mt-2 leading-7 text-stone-300">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="grid min-w-0 gap-6 py-8 lg:grid-cols-2">
        <article className="min-w-0 rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
            Ubicación y atención
          </p>
          <h2 className="mt-3 text-3xl font-black text-stone-50">Qué esperar antes de venir</h2>
          <ul className="mt-5 space-y-3 text-stone-300">
            {visitExpectations.map((item) => (
              <li className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="min-w-0 rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
            Higiene y soporte
          </p>
          <h2 className="mt-3 text-3xl font-black text-stone-50">
            Acompañamiento después de la sesión
          </h2>
          <ul className="mt-5 space-y-3 text-stone-300">
            {supportExpectations.map((item) => (
              <li className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="py-8" aria-labelledby="next-steps-heading">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Rutas útiles
        </p>
        <h2 id="next-steps-heading" className="mt-3 text-3xl font-black text-stone-50">
          Prepara mejor tu solicitud antes de agendar.
        </h2>
        <div className="mt-6 grid min-w-0 gap-4 md:grid-cols-3">
          {contactLinks.map((link) => (
            <a
              className="min-w-0 rounded-3xl border border-stone-800 bg-stone-950/70 p-5 shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:border-amber-300/60"
              href={link.href}
              key={link.href}
            >
              <h3 className="text-xl font-black text-stone-50">{link.label}</h3>
              <p className="mt-2 leading-7 text-stone-300">{link.description}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="py-10">
        <div className="flex flex-col gap-4 rounded-3xl border border-amber-300/30 bg-amber-300 p-6 text-stone-950 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-black">¿Quieres coordinar una evaluación?</h2>
            <p className="mt-2 max-w-2xl text-stone-800">
              Envía tu cotización con datos concretos. El estudio revisará el proyecto antes de
              confirmar próximos pasos, ubicación e indicaciones de llegada.
            </p>
          </div>
          <a
            className="rounded-full bg-stone-950 px-6 py-3 text-center font-semibold text-stone-50 transition hover:bg-stone-800"
            href="/quote"
          >
            Empezar cotización
          </a>
        </div>
      </section>
    </main>
  );
}
