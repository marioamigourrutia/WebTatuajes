import { appConfig } from "@/lib/config/app";
import { getFeaturedPortfolioItems } from "@/lib/portfolio/portfolio";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

const services = [
  "Línea fina y minimalista",
  "Blackwork y sombras suaves",
  "Diseños personalizados",
  "Cover-up evaluado caso a caso",
];

const processSteps = [
  "Cuéntanos la idea, zona, tamaño y presupuesto estimado.",
  "Revisamos viabilidad, estilo y próximos pasos de diseño.",
  "Coordinamos contacto y agenda cuando el proyecto esté claro.",
];

export default function HomePage() {
  const featuredPortfolioItems = getFeaturedPortfolioItems(3);
  const whatsappUrl = hasWhatsAppConfig(appConfig.whatsappPhone)
    ? buildWhatsAppUrl({
        phone: appConfig.whatsappPhone,
        message: appConfig.whatsappMessage,
      })
    : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <section className="relative grid items-center gap-10 overflow-hidden rounded-[2rem] border border-amber-100/10 bg-stone-950/55 px-5 py-12 shadow-2xl shadow-black/30 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-px w-1/2 bg-gradient-to-r from-transparent via-amber-300/30 to-transparent" />
        <div className="space-y-8">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-amber-200">
            Estudio profesional en Chile · {appConfig.artistName}
          </p>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] text-stone-50 sm:text-7xl">
              {appConfig.studioName}: tatuajes con diseño, criterio y una experiencia segura.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-300">
              Mario Amigo Urrutia convierte ideas en piezas pensadas para tu cuerpo, tu ritmo y tu
              historia. El primer contacto parte con una cotización clara, privada y revisada por el
              estudio.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              className="rounded-full bg-amber-300 px-6 py-3 text-center font-semibold text-stone-950 shadow-lg shadow-amber-950/30 transition hover:-translate-y-0.5 hover:bg-amber-200"
              href="/quote"
            >
              Solicitar cotización
            </a>
            {whatsappUrl ? (
              <a
                className="rounded-full border border-amber-300/50 bg-stone-950/40 px-6 py-3 text-center font-semibold text-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-300 hover:text-stone-950"
                href={whatsappUrl}
              >
                Escribir por WhatsApp
              </a>
            ) : null}
          </div>
        </div>

        <aside className="rounded-3xl border border-amber-100/15 bg-gradient-to-br from-stone-900/90 to-stone-950/90 p-6 shadow-2xl shadow-black/30">
          <div className="mb-5 inline-flex max-w-full rounded-full border border-amber-300/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            Diseño personalizado premium
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">
            Atención enfocada
          </p>
          <h2 className="mt-3 text-2xl font-bold text-stone-50">De la idea al diseño viable</h2>
          <p className="mt-3 text-stone-300">
            Revisamos zona, tamaño, estilo, cicatrización esperada y referencias antes de avanzar.
            Sin promesas automáticas: cada proyecto se evalúa con criterio profesional.
          </p>
          <dl className="mt-6 grid gap-3 text-sm text-stone-300 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
              <dt className="font-semibold text-stone-100">Privado</dt>
              <dd className="mt-1">Tus datos se tratan con reserva durante la evaluación.</dd>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
              <dt className="font-semibold text-stone-100">Ordenado</dt>
              <dd className="mt-1">Cada solicitud se revisa con contexto antes de responder.</dd>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4">
              <dt className="font-semibold text-stone-100">Claro</dt>
              <dd className="mt-1">
                La cotización define viabilidad antes de reservar una sesión.
              </dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
              Portafolio
            </p>
            <h2 className="mt-3 text-3xl font-black text-stone-50">
              Una muestra visual antes de cotizar.
            </h2>
            <p className="mt-3 max-w-2xl text-stone-300">
              Piezas y referencias curadas por estilo, zona y etiquetas para preparar mejor tu
              cotización.
            </p>
          </div>
          <a
            className="rounded-full border border-amber-300/50 px-6 py-3 text-center font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
            href="/portfolio"
          >
            Ver portafolio completo
          </a>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {featuredPortfolioItems.map((item) => (
            <article
              className="group overflow-hidden rounded-3xl border border-stone-800 bg-stone-950/70 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-amber-300/40"
              key={item.id}
            >
              <div
                className="h-40 transition duration-500 group-hover:scale-105"
                style={{ background: item.gradient }}
              />
              <div className="space-y-3 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                  {item.style} · {item.bodyArea}
                </p>
                <h3 className="text-xl font-black text-stone-50">{item.title}</h3>
                <p className="text-sm leading-6 text-stone-300">{item.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="py-10">
        <div className="grid gap-6 rounded-3xl border border-amber-100/10 bg-gradient-to-br from-stone-950/90 to-stone-900/60 p-6 shadow-xl shadow-black/20 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
              Obras disponibles
            </p>
            <h2 className="mt-3 text-3xl font-black text-stone-50">
              Flash y piezas listas para consultar.
            </h2>
          </div>
          <div className="space-y-4 text-stone-300">
            <p className="leading-7">
              Revisa obras disponibles y envía una solicitud breve. El sistema guarda el interés y
              prepara un mensaje de WhatsApp; la coordinación se confirma manualmente con el
              estudio.
            </p>
            <a
              className="inline-flex rounded-full border border-amber-300/50 px-6 py-3 font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
              href="/tienda"
            >
              Ver obras disponibles
            </a>
          </div>
        </div>
      </section>

      <section className="grid gap-6 py-10 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
            Estilos y servicios
          </p>
          <h2 className="mt-3 text-3xl font-black text-stone-50">
            Trabajo personalizado, no catálogo genérico.
          </h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {services.map((item) => (
            <li
              className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-stone-200"
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
        <a
          className="mt-5 inline-flex rounded-full border border-amber-300/50 px-6 py-3 font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950 md:col-start-2"
          href="/servicios"
        >
          Ver servicios, cuidados y preguntas frecuentes
        </a>
      </section>

      <section className="py-10" id="proceso">
        <div className="rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Proceso</p>
          <h2 className="mt-3 text-3xl font-black text-stone-50">
            Cotizar primero evita improvisar después.
          </h2>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {processSteps.map((step, index) => (
              <li
                className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-stone-300"
                key={step}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-300/10 text-sm font-bold text-amber-300">
                  0{index + 1}
                </span>
                <p className="mt-2">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-10">
        <div className="grid gap-6 rounded-3xl border border-stone-700 bg-stone-950/70 p-6 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
              Contacto
            </p>
            <h2 className="mt-3 text-3xl font-black text-stone-50">
              Atención por agenda y ubicación confirmada al reservar.
            </h2>
          </div>
          <div className="space-y-4 text-stone-300">
            <p className="leading-7">
              Prepara tu solicitud con idea, zona, tamaño y referencias. El estudio confirma
              próximos pasos, indicaciones de llegada y cuidados esperados cuando la cita queda
              coordinada.
            </p>
            <a
              className="inline-flex rounded-full border border-amber-300/50 px-6 py-3 font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
              href="/contacto"
            >
              Ver contacto y ubicación
            </a>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="flex flex-col gap-4 rounded-3xl border border-amber-300/30 bg-amber-300 p-6 text-stone-950 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-black">¿Tienes una idea para tatuarte?</h2>
            <p className="mt-2 max-w-2xl text-stone-800">
              Envía una cotización con datos concretos para revisar viabilidad, estilo y próximos
              pasos.
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
