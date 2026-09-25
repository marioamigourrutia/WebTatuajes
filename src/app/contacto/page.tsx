import type { Metadata } from "next";
import Link from "next/link";
import { appConfig } from "@/lib/config/app";
import {
  contactHighlights,
  contactLinks,
  supportExpectations,
  visitExpectations,
} from "@/lib/contact/public-contact";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacto, agenda y soporte para cotizaciones de tatuajes personalizados en realismo black & grey.",
};

const supportSections = [
  {
    eyebrow: "Antes de la cita",
    title: "Preparación y puntualidad",
    items: visitExpectations,
  },
  {
    eyebrow: "Después de la sesión",
    title: "Cuidados y seguimiento",
    items: supportExpectations,
  },
] as const;

export default function ContactPage() {
  const whatsappUrl = hasWhatsAppConfig(appConfig.whatsappPhone)
    ? buildWhatsAppUrl({ phone: appConfig.whatsappPhone, message: appConfig.whatsappMessage })
    : null;

  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="08"
          eyebrow="Contacto · atención por agenda"
          title="Hablemos de tu próxima pieza."
          description="Cada proyecto se revisa antes de confirmar una sesión. Para una respuesta más precisa, comienza por la cotización y continúa por el canal adecuado."
          tone="wine"
          meta={["Chile", "Agenda", "Respuesta directa"]}
        >
          <div className="flex flex-wrap gap-2">
            <Link className="neo-button" href="/quote">
              Cotizar
            </Link>
            <Link className="neo-button-outline" href="/quote/status">
              Seguimiento
            </Link>
            {whatsappUrl ? (
              <a className="neo-button-outline" href={whatsappUrl} rel="noreferrer" target="_blank">
                WhatsApp ↗
              </a>
            ) : null}
          </div>
        </EditorialPageHero>

        <section className="mt-4 border border-[#cec6c2]/14">
          <div className="grid lg:grid-cols-[0.72fr_1.28fr]">
            <div className="border-b border-[#cec6c2]/14 p-5 sm:p-7 lg:border-b-0 lg:border-r">
              <p className="neo-kicker">Cómo trabajamos</p>
              <h2 className="neo-mega mt-6 text-[clamp(4.2rem,11vw,8.5rem)] text-[#cec6c2]">
                Atención clara
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-[#837f7c]">
                Una comunicación clara desde la primera idea hasta el cuidado posterior.
              </p>
            </div>

            <div className="grid md:grid-cols-3">
              {contactHighlights.map((item, index) => (
                <article
                  className="min-h-64 border-b border-[#cec6c2]/14 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                  key={item.title}
                >
                  <span className="neo-index">0{index + 1}</span>
                  <h3 className="mt-14 text-base font-semibold text-[#cec6c2]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#837f7c]">{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-4 grid border border-[#cec6c2]/14 lg:grid-cols-2">
          {supportSections.map(({ eyebrow, title, items }, columnIndex) => (
            <article
              className={`p-5 sm:p-7 ${columnIndex === 0 ? "border-b border-[#cec6c2]/14 lg:border-b-0 lg:border-r" : ""}`}
              key={eyebrow}
            >
              <p className="neo-kicker">{eyebrow}</p>
              <h2 className="neo-display mt-5 text-[clamp(2.7rem,6vw,5rem)] text-[#cec6c2]">
                {title}
              </h2>
              <div className="mt-8 divide-y divide-[#cec6c2]/14 border-y border-[#cec6c2]/14">
                {items.map((item, index) => (
                  <div className="grid grid-cols-[auto_1fr] gap-4 py-4" key={item}>
                    <span className="neo-index">{String(index + 1).padStart(2, "0")}</span>
                    <p className="text-sm leading-6 text-[#b7aaa4]">{item}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="editorial-strip-paper mt-4 p-5 sm:p-7 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="neo-kicker !text-[#370803]">Rutas útiles</p>
              <h2 className="neo-mega mt-5 text-[clamp(4rem,10vw,8rem)] text-[#141414]">
                Siguiente paso
              </h2>
            </div>
            <div className="grid border border-[#141414]/16 md:grid-cols-3">
              {contactLinks.map((link, index) => (
                <Link
                  className="min-h-52 border-b border-[#141414]/16 p-5 transition hover:bg-[#b7aaa4] md:border-b-0 md:border-r md:last:border-r-0"
                  href={link.href}
                  key={link.href}
                >
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#370803]/60">
                    0{index + 1}
                  </span>
                  <h3 className="mt-12 text-base font-bold text-[#141414]">{link.label}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#370803]/72">{link.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
