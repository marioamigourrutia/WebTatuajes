import type { Sponsor } from "./sponsor";

export function PublicSponsorsSection({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;

  return (
    <section className="py-16">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">Colaboradores</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
            Marcas y proyectos con los que trabajo.
          </h2>
        </div>
        <a
          className="text-sm font-semibold text-zinc-400 transition hover:text-white"
          href="/colaboradores"
        >
          Ver colaboradores →
        </a>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {sponsors.slice(0, 3).map((sponsor) => (
          <article className="rounded-2xl border border-white/10 bg-[#0b0b0d] p-5" key={sponsor.id}>
            <div className="flex items-center gap-3">
              {sponsor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={sponsor.name} className="h-12 w-12 rounded-xl object-cover" src={sponsor.logoUrl} />
              ) : null}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">{sponsor.category}</p>
                <h3 className="mt-1 text-lg font-bold text-zinc-100">{sponsor.name}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-400">{sponsor.description}</p>
            {sponsor.websiteUrl ? (
              <a
                className="mt-4 inline-flex text-sm font-semibold text-zinc-300 transition hover:text-white"
                href={sponsor.websiteUrl}
                rel="noreferrer"
                target="_blank"
              >
                Visitar sitio →
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
