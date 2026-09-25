import Link from "next/link";
import { CommunityMemberForm } from "@/lib/community/member-form";
import { appConfig } from "@/lib/config/app";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";

export const metadata = {
  title: "Comunidad | Mario Amigo Tattoo",
  description:
    "Únete a la comunidad de Mario Amigo Tattoo para recibir novedades de agenda, proyectos y contenido seleccionado.",
};

export default function CommunityPage() {
  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="06"
          eyebrow="Comunidad · novedades"
          title="Novedades sin ruido."
          description={`Un espacio para recibir novedades de agenda, proyectos, contenido y actividades relacionadas con el trabajo de ${appConfig.brandName}. No reemplaza una cotización ni confirma una cita.`}
          tone="wine"
          meta={["Agenda", "Proyectos", "Contenido"]}
        >
          <div className="flex flex-wrap gap-2">
            <Link className="neo-button" href="/quote">
              Solicitar cotización
            </Link>
            <a
              className="neo-button-outline"
              href={appConfig.instagramUrl}
              rel="noreferrer"
              target="_blank"
            >
              Instagram ↗
            </a>
          </div>
        </EditorialPageHero>

        <section className="mt-4 grid border border-[#cec6c2]/14 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="border-b border-[#cec6c2]/14 p-5 sm:p-7 lg:border-b-0 lg:border-r">
            <p className="neo-kicker">Qué recibirás</p>
            <h2 className="neo-mega mt-7 text-[clamp(4rem,10vw,8rem)] text-[#cec6c2]">
              Mantente al día
            </h2>
            <div className="mt-10 divide-y divide-[#cec6c2]/14 border-y border-[#cec6c2]/14">
              {[
                ["01", "Agenda", "Avisos relevantes sobre disponibilidad y apertura de agenda."],
                ["02", "Proyectos", "Selección de trabajos, procesos y piezas de interés."],
                ["03", "Contenido", "Novedades puntuales sin convertir tu correo en una campaña constante."],
              ].map(([index, title, description]) => (
                <article className="grid grid-cols-[auto_1fr] gap-5 py-4" key={index}>
                  <span className="neo-index pt-1">{index}</span>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-[#cec6c2]">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#837f7c]">{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="bg-[#202020] p-5 sm:p-7 lg:p-10">
            <p className="neo-kicker">Comunidad</p>
            <h2 className="neo-display mt-5 max-w-xl text-[clamp(2.8rem,7vw,5.5rem)] text-[#cec6c2]">
              Súmate a la lista
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#837f7c]">
              Deja tu nombre y email. Puedes darte de baja cuando quieras.
            </p>
            <div className="mt-8">
              <CommunityMemberForm />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
