import Link from "next/link";
import { CommunityMemberForm } from "@/lib/community/member-form";
import { appConfig } from "@/lib/config/app";

export const metadata = {
  title: "Comunidad | Mario Amigo Tattoo",
  description:
    "Únete a la comunidad de Mario Amigo Tattoo para recibir novedades de agenda, proyectos y contenido seleccionado.",
};

export default function CommunityPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8 sm:py-16">
      <section className="grid gap-10 border-b border-white/10 pb-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-zinc-500">Comunidad</p>
          <h1 className="mt-4 text-balance text-4xl font-black leading-[0.98] tracking-[-0.045em] text-zinc-50 sm:text-6xl">
            Novedades sin ruido.
          </h1>
          <p className="mt-5 text-base leading-8 text-zinc-400">
            Un espacio para recibir novedades de agenda, proyectos, contenido y actividades relacionadas
            con el trabajo de {appConfig.brandName}. No reemplaza una cotización ni confirma una cita.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="rounded-full border border-white/15 bg-[#111113] px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-white/30 hover:bg-zinc-900"
              href="/quote"
            >
              Solicitar cotización
            </Link>
            <a
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-white/25 hover:text-white"
              href={appConfig.instagramUrl}
              rel="noreferrer"
              target="_blank"
            >
              Ver Instagram
            </a>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-[#09090b] p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Mantente al día</p>
          <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-zinc-100">
            Súmate a la lista de novedades
          </h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400">
            Deja tu nombre y email. Puedes darte de baja cuando quieras.
          </p>
          <div className="mt-6">
            <CommunityMemberForm />
          </div>
        </div>
      </section>

      <section className="grid gap-4 py-10 sm:grid-cols-3">
        {[
          ["Agenda", "Avisos relevantes sobre disponibilidad y apertura de agenda."],
          ["Proyectos", "Selección de trabajos, procesos y piezas de interés."],
          ["Contenido", "Novedades puntuales sin convertir tu correo en una campaña constante."],
        ].map(([title, description]) => (
          <article className="border-t border-white/10 pt-5" key={title}>
            <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-zinc-200">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-500">{description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
