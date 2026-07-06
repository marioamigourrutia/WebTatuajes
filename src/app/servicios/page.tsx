import type { Metadata } from "next";
import {
  aftercareSteps,
  bookingExpectations,
  hygienePractices,
  serviceFaqs,
  tattooServices,
} from "@/lib/services/public-services";

export const metadata: Metadata = {
  title: "Servicios y cuidados",
  description:
    "Servicios de tatuaje, higiene, proceso de reserva, cuidados posteriores y preguntas frecuentes para cotizar en Chile.",
};

export default function ServicesPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <section className="relative space-y-6 overflow-hidden rounded-[2rem] border border-amber-100/10 bg-stone-950/55 p-6 py-12 shadow-2xl shadow-black/25 sm:p-8 sm:py-14">
        <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-amber-300">
          Servicios y cuidados
        </p>
        <h1 className="max-w-4xl text-5xl font-black leading-tight text-stone-50 sm:text-7xl">
          Información clara antes de pedir tu cotización.
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-stone-300">
          Revisa estilos, expectativas de reserva, higiene y cuidados básicos para llegar con una
          idea mejor preparada. Si tu proyecto calza, el siguiente paso es enviar una solicitud con
          contexto.
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
            href="/portfolio"
          >
            Ver portafolio
          </a>
        </div>
      </section>

      <section className="grid gap-4 py-8 md:grid-cols-2" aria-labelledby="services-heading">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
            Qué hacemos
          </p>
          <h2 id="services-heading" className="mt-3 text-3xl font-black text-stone-50">
            Servicios enfocados en diseño y viabilidad.
          </h2>
        </div>
        <div className="grid gap-4">
          {tattooServices.map((service) => (
            <article
              className="rounded-3xl border border-stone-800 bg-stone-950/70 p-5 shadow-xl shadow-black/15 transition hover:border-amber-300/40"
              key={service.title}
            >
              <h3 className="text-xl font-black text-stone-50">{service.title}</h3>
              <p className="mt-2 leading-7 text-stone-300">{service.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 py-8 lg:grid-cols-2">
        <article className="rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Reserva</p>
          <h2 className="mt-3 text-3xl font-black text-stone-50">Qué esperamos antes de agendar</h2>
          <ul className="mt-5 space-y-3 text-stone-300">
            {bookingExpectations.map((item) => (
              <li className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Higiene</p>
          <h2 className="mt-3 text-3xl font-black text-stone-50">Seguridad durante la sesión</h2>
          <ul className="mt-5 space-y-3 text-stone-300">
            {hygienePractices.map((item) => (
              <li className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="py-8" aria-labelledby="aftercare-heading">
        <div className="rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
            Cuidados posteriores
          </p>
          <h2 id="aftercare-heading" className="mt-3 text-3xl font-black text-stone-50">
            La cicatrización también es parte del resultado.
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {aftercareSteps.map((step, index) => (
              <li
                className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-stone-300 transition hover:border-amber-300/30"
                key={step}
              >
                <span className="text-sm font-bold text-amber-300">0{index + 1}</span>
                <p className="mt-2 leading-7">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-8" aria-labelledby="faq-heading">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">FAQ</p>
        <h2 id="faq-heading" className="mt-3 text-3xl font-black text-stone-50">
          Preguntas frecuentes antes de cotizar
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {serviceFaqs.map((faq) => (
            <article
              className="rounded-3xl border border-stone-800 bg-stone-950/70 p-5"
              key={faq.question}
            >
              <h3 className="text-xl font-black text-stone-50">{faq.question}</h3>
              <p className="mt-2 leading-7 text-stone-300">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="py-10">
        <div className="flex flex-col gap-4 rounded-3xl border border-amber-300/30 bg-amber-300 p-6 text-stone-950 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-black">¿Listo para revisar tu idea?</h2>
            <p className="mt-2 max-w-2xl text-stone-800">
              Envía una cotización con referencias, zona y tamaño aproximado para que el estudio
              pueda responder con criterio.
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
