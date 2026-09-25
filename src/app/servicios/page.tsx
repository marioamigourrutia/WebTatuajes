import type { Metadata } from "next";
import { appConfig } from "@/lib/config/app";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";
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

const sessionInfoSections = [
  {
    eyebrow: "Reserva",
    title: "Qué esperamos antes de agendar",
    items: bookingExpectations,
  },
  {
    eyebrow: "Higiene",
    title: "Seguridad durante la sesión",
    items: hygienePractices,
  },
] as const;

export default function ServicesPage() {
  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="09"
          eyebrow="Servicios · información previa"
          title="Información clara antes de cotizar."
          description="Revisa estilos, expectativas de reserva, higiene y cuidados básicos para llegar con una idea mejor preparada."
          meta={["Antes de la sesión", "Cuidados", "Preguntas frecuentes"]}
        >
          <div className="flex flex-wrap gap-2">
            <a className="neo-button" href="/quote">Solicitar cotización</a>
            <a className="neo-button-outline" href={appConfig.instagramUrl} rel="noreferrer" target="_blank">Ver Instagram ↗</a>
          </div>
        </EditorialPageHero>

        <section className="editorial-strip-paper mt-4 p-5 sm:p-7 lg:p-10" aria-labelledby="services-heading">
          <div className="grid gap-8 lg:grid-cols-[0.68fr_1.32fr] lg:items-end">
            <div>
              <p className="neo-kicker !text-[#370803]">Qué hacemos</p>
              <h2 id="services-heading" className="neo-mega mt-5 text-[clamp(4.3rem,11vw,9rem)] text-[#141414]">Servicios</h2>
            </div>
            <div className="grid border border-[#141414]/16 md:grid-cols-2">
              {tattooServices.map((service, index) => (
                <article className="min-h-52 border-b border-[#141414]/16 p-5 odd:md:border-r md:[&:nth-last-child(-n+2)]:border-b-0" key={service.title}>
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#370803]/60">0{index + 1}</span>
                  <h3 className="mt-10 text-base font-bold text-[#141414]">{service.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#370803]/72">{service.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 border border-[#cec6c2]/14 bg-[#181818] p-5 sm:p-7 lg:p-10">
          <p className="neo-kicker">Antes de tu sesión</p>
          <h2 className="neo-mega mt-5 text-[clamp(4rem,11vw,8.8rem)] text-[#cec6c2]">Información útil</h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {sessionInfoSections.map(({ eyebrow, title, items }) => (
              <article className="border border-[#cec6c2]/14 bg-[#202020] p-5 sm:p-6" key={eyebrow}>
                <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#66615e]">{eyebrow}</p>
                <h3 className="neo-display mt-4 text-[clamp(2.2rem,5vw,4rem)] leading-[0.95] text-[#cec6c2]">{title}</h3>
                <div className="mt-6 divide-y divide-[#cec6c2]/14 border-y border-[#cec6c2]/14">
                  {items.map((item, index) => (
                    <div className="grid grid-cols-[auto_1fr] gap-4 py-4" key={item}>
                      <span className="neo-index">{String(index + 1).padStart(2, "0")}</span>
                      <p className="text-sm leading-6 text-[#b7aaa4]">{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-4 border border-[#cec6c2]/14 p-5 sm:p-7 lg:p-10" aria-labelledby="aftercare-heading">
          <div className="grid gap-8 lg:grid-cols-[0.62fr_1.38fr] lg:items-end">
            <div>
              <p className="neo-kicker">Cuidados posteriores</p>
              <h2 id="aftercare-heading" className="neo-display mt-5 text-[clamp(3rem,8vw,6.5rem)] leading-[0.96] text-[#cec6c2]">La cicatrización también es parte del resultado.</h2>
            </div>
            <ol className="grid border border-[#cec6c2]/14 sm:grid-cols-2 lg:grid-cols-4">
              {aftercareSteps.map((step, index) => (
                <li className="min-h-56 border-b border-[#cec6c2]/14 p-4 sm:border-r lg:border-b-0 lg:last:border-r-0" key={step}>
                  <span className="neo-index">0{index + 1}</span>
                  <div className="mt-10 text-3xl text-[#837f7c]" aria-hidden="true">✦</div>
                  <p className="mt-5 text-sm leading-6 text-[#b7aaa4]">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-4 border border-[#cec6c2]/14 bg-[#202020] p-5 sm:p-7 lg:p-10" aria-labelledby="faq-heading">
          <div className="grid gap-8 lg:grid-cols-[0.62fr_1.38fr]">
            <div>
              <p className="neo-kicker">Dudas habituales</p>
              <h2 id="faq-heading" className="neo-mega mt-5 text-[clamp(4rem,10vw,8rem)] text-[#cec6c2]">Preguntas frecuentes</h2>
            </div>
            <div className="divide-y divide-[#cec6c2]/20 border-y border-[#cec6c2]/20">
              {serviceFaqs.map((faq, index) => (
                <details className="group py-4" key={faq.question}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[#cec6c2]">
                    <span className="flex items-center gap-4"><span className="neo-index">{String(index + 1).padStart(2, "0")}</span>{faq.question}</span>
                    <span className="text-lg text-[#837f7c] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="ml-10 mt-3 max-w-2xl text-sm leading-7 text-[#837f7c]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
