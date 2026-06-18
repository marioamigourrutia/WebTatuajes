import { appConfig } from "@/lib/config/app";
import { LoginPanel } from "@/lib/auth/login-panel";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const highlights = ["Cotizaciones privadas", "Portafolio profesional", "Agenda segura"];

export default function HomePage() {
  const whatsappUrl = buildWhatsAppUrl({
    phone: appConfig.whatsappPhone,
    message: appConfig.whatsappMessage,
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10">
      <header className="flex items-center justify-between py-4">
        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          WebTatuajes
        </span>
        <a
          className="rounded-full border border-amber-300/50 px-4 py-2 text-sm text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
          href={whatsappUrl}
        >
          WhatsApp
        </a>
      </header>

      <section className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-8">
          <p className="text-sm font-medium uppercase tracking-[0.35em] text-stone-300">
            Estudio profesional en Chile
          </p>
          <div className="space-y-5">
            <h1 className="max-w-4xl text-5xl font-black leading-tight text-stone-50 sm:text-7xl">
              Tatuajes con diseño, criterio y una experiencia segura.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-300">
              Esta base técnica prepara la plataforma para portafolio, cotizaciones con imágenes
              privadas, agenda y contenido administrable.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              className="rounded-full bg-amber-300 px-6 py-3 font-semibold text-stone-950 transition hover:bg-amber-200"
              href="/quote"
            >
              Solicitar cotización
            </a>
            <a
              className="rounded-full border border-amber-300/50 px-6 py-3 font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
              href={whatsappUrl}
            >
              WhatsApp
            </a>
            <a
              className="rounded-full border border-stone-500 px-6 py-3 font-semibold text-stone-100 transition hover:border-stone-200"
              href="#estado"
            >
              Ver estado del proyecto
            </a>
          </div>
        </div>

        <aside
          id="estado"
          className="rounded-3xl border border-stone-700 bg-stone-950/70 p-6 shadow-2xl shadow-black/30"
        >
          <h2 className="text-2xl font-bold text-stone-50">Base en construcción</h2>
          <p className="mt-3 text-stone-300">
            Primer flujo de negocio local: solicitudes de cotización públicas guardadas desde el
            servidor y visibles para admin validado server-side.
          </p>
          <ul className="mt-6 grid gap-3">
            {highlights.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-stone-800 bg-stone-900/70 px-4 py-3 text-stone-200"
              >
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-6 rounded-2xl border border-stone-800 bg-stone-900/60 p-4">
            <h3 className="text-lg font-semibold text-stone-50">Acceso inicial</h3>
            <p className="mt-2 text-sm leading-6 text-stone-400">
              Base mínima para login. Los roles de artista/admin se asignan solo por proceso
              controlado, nunca por autogestión pública.
            </p>
            <div className="mt-4">
              <LoginPanel />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
