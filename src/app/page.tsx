import { appConfig } from "@/lib/config/app";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

const services = [
  "Línea fina y minimalista",
  "Blackwork y sombras suaves",
  "Diseños personalizados",
  "Cover-up evaluado caso a caso",
];

const processSteps = [
  "Contanos la idea, zona, tamaño y presupuesto estimado.",
  "Revisamos viabilidad, estilo y próximos pasos de diseño.",
  "Coordinamos contacto y agenda cuando el proyecto esté claro.",
];

export default function HomePage() {
  const whatsappUrl = hasWhatsAppConfig(appConfig.whatsappPhone)
    ? buildWhatsAppUrl({
        phone: appConfig.whatsappPhone,
        message: appConfig.whatsappMessage,
      })
    : null;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <section className="grid items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-stone-300">
            Estudio profesional en Chile
          </p>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-black leading-tight text-stone-50 sm:text-7xl">
              Tatuajes con diseño, criterio y una experiencia segura.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-300">
              Convertimos ideas en piezas pensadas para tu cuerpo, tu ritmo y tu historia. El primer
              contacto parte con una cotización clara, privada y revisada por el estudio.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              className="rounded-full bg-amber-300 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-200"
              href="/quote"
            >
              Solicitar cotización
            </a>
            {whatsappUrl ? (
              <a
                className="rounded-full border border-amber-300/50 px-6 py-3 font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
                href={whatsappUrl}
              >
                WhatsApp
              </a>
            ) : null}
            <a
              className="rounded-full border border-stone-500 px-6 py-3 font-semibold text-stone-100 transition hover:border-stone-200"
              href="#proceso"
            >
              Ver proceso
            </a>
          </div>
        </div>

        <aside className="rounded-3xl border border-stone-700 bg-stone-950/70 p-6 shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">
            Atención enfocada
          </p>
          <h2 className="mt-3 text-2xl font-bold text-stone-50">De la idea al diseño viable</h2>
          <p className="mt-3 text-stone-300">
            Revisamos zona, tamaño, estilo, cicatrización esperada y referencias antes de avanzar.
            Sin promesas automáticas: cada proyecto se evalúa con criterio profesional.
          </p>
          <dl className="mt-6 grid gap-3 text-sm text-stone-300 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
              <dt className="font-semibold text-stone-100">Privado</dt>
              <dd className="mt-1">La solicitud se guarda server-side, no desde cliente.</dd>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
              <dt className="font-semibold text-stone-100">Ordenado</dt>
              <dd className="mt-1">El equipo revisa estados internos desde el panel admin.</dd>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4">
              <dt className="font-semibold text-stone-100">Local MVP</dt>
              <dd className="mt-1">Sin pagos ni agenda real todavía; foco en cotización.</dd>
            </div>
          </dl>
        </aside>
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
                <span className="text-sm font-bold text-amber-300">0{index + 1}</span>
                <p className="mt-2">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-10">
        <div className="flex flex-col gap-4 rounded-3xl border border-amber-300/30 bg-amber-300 p-6 text-stone-950 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-3xl font-black">¿Tenés una idea para tatuarte?</h2>
            <p className="mt-2 max-w-2xl text-stone-800">
              Mandá una cotización con datos concretos y el estudio la revisa desde el panel local.
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
