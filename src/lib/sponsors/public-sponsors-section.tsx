import type { Sponsor } from "./sponsor";

export function PublicSponsorsSection({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;

  return (
    <section className="py-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
            Colaboradores
          </p>
          <h2 className="mt-3 text-3xl font-black text-stone-50">
            Marcas y aliados que acompañan al estudio.
          </h2>
          <p className="mt-3 max-w-2xl text-stone-300">
            Una selección de proveedores, marcas y proyectos cercanos al trabajo del estudio.
          </p>
        </div>
        <a
          className="rounded-full border border-amber-300/50 px-6 py-3 text-center font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
          href="/colaboradores"
        >
          Ver colaboradores
        </a>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {sponsors.slice(0, 3).map((sponsor) => (
          <article
            className="rounded-3xl border border-stone-800 bg-stone-950/70 p-5 shadow-xl shadow-black/20"
            key={sponsor.id}
          >
            <div className="flex items-start gap-3">
              {sponsor.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={sponsor.name}
                  className="h-14 w-14 rounded-2xl object-cover"
                  src={sponsor.logoUrl}
                />
              ) : null}
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                  {sponsor.category}
                </p>
                <h3 className="mt-2 text-xl font-black text-stone-50">{sponsor.name}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-stone-300">{sponsor.description}</p>
            {sponsor.websiteUrl ? (
              <a
                className="mt-4 inline-flex text-sm font-semibold text-amber-200 hover:text-amber-100"
                href={sponsor.websiteUrl}
                rel="noreferrer"
                target="_blank"
              >
                Visitar sitio
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
