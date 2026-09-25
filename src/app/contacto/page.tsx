import type { Metadata } from "next";
import Link from "next/link";
import { appConfig } from "@/lib/config/app";
import {
  contactHighlights,
  contactLinks,
  supportExpectations,
  visitExpectations,
} from "@/lib/contact/public-contact";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacto, agenda y soporte para cotizaciones de tatuajes personalizados en realismo black & grey.",
};

export default function ContactPage() {
  const whatsappUrl = hasWhatsAppConfig(appConfig.whatsappPhone)
    ? buildWhatsAppUrl({ phone: appConfig.whatsappPhone, message: appConfig.whatsappMessage })
    : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/60 p-6 py-12 shadow-2xl shadow-black/40 sm:p-9 sm:py-14">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/[0.06] blur-3xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
          Contacto · atención por agenda
        </p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-7xl">
          Hablemos de tu próxima pieza.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-400 sm:text-lg">
          Cada proyecto se revisa antes de confirmar una sesión. Para una respuesta más precisa,
          comienza por la cotización y envía tus referencias por WhatsApp, Instagram o email una vez
          registrado el código de solicitud.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            className="rounded-full bg-zinc-100 px-6 py-3 text-center font-semibold text-zinc-950 transition hover:bg-white"
            href="/quote"
          >
            Solicitar cotización
          </Link>
          <Link
            className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-center font-semibold text-zinc-100 transition hover:bg-white/10"
            href="/quote/status"
          >
            Seguimiento de cotización
          </Link>
          {whatsappUrl ? (
            <a
              className="rounded-full border border-white/15 bg-white/[0.03] px-6 py-3 text-center font-semibold text-zinc-100 transition hover:bg-white/10"
              href={whatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              WhatsApp
            </a>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 py-8 md:grid-cols-3" aria-labelledby="contact-intent-heading">
        <div className="md:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Cómo trabajamos
          </p>
          <h2 id="contact-intent-heading" className="mt-3 text-3xl font-black text-white">
            Una comunicación clara desde la primera idea.
          </h2>
        </div>
        {contactHighlights.map((item) => (
          <article
            className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-xl shadow-black/15 transition hover:border-white/20"
            key={item.title}
          >
            <h3 className="text-xl font-black text-white">{item.title}</h3>
            <p className="mt-2 leading-7 text-zinc-400">{item.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 py-8 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-black/45 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Antes de la cita
          </p>
          <h2 className="mt-3 text-3xl font-black text-white">Preparación y puntualidad</h2>
          <ul className="mt-5 space-y-3 text-zinc-300">
            {visitExpectations.map((item) => (
              <li className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-3xl border border-white/10 bg-black/45 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Después de la sesión
          </p>
          <h2 className="mt-3 text-3xl font-black text-white">Cuidados y seguimiento</h2>
          <ul className="mt-5 space-y-3 text-zinc-300">
            {supportExpectations.map((item) => (
              <li className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4" key={item}>
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="py-8" aria-labelledby="contact-links-heading">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Rutas útiles</p>
        <h2 id="contact-links-heading" className="mt-3 text-3xl font-black text-white">
          Continúa por el canal correcto.
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {contactLinks.map((link) => (
            <Link
              className="rounded-3xl border border-white/10 bg-black/45 p-5 shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:border-white/25"
              href={link.href}
              key={link.href}
            >
              <h3 className="text-xl font-black text-white">{link.label}</h3>
              <p className="mt-2 leading-7 text-zinc-400">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="py-10">
        <div className="flex flex-col gap-5 rounded-[2rem] border border-white/15 bg-zinc-100 p-6 text-zinc-950 shadow-2xl shadow-black/20 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Próximo paso
            </p>
            <h2 className="mt-2 text-3xl font-black">Cuéntame qué quieres tatuarte.</h2>
            <p className="mt-2 max-w-2xl text-zinc-700">
              Completa la cotización, revisa la disponibilidad del calendario y luego adjunta tus
              referencias por el canal que prefieras.
            </p>
          </div>
          <Link
            className="rounded-full bg-black px-6 py-3 text-center font-semibold text-white transition hover:bg-zinc-800"
            href="/quote"
          >
            Empezar cotización
          </Link>
        </div>
      </section>
    </main>
  );
}
