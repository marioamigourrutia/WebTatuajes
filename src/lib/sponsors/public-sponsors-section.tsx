import type { Sponsor } from "./sponsor";

export function PublicSponsorsSection({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;

  return (
    <section className="py-14 sm:py-20">
      <div className="grid gap-8 lg:grid-cols-[0.68fr_1.32fr] lg:items-end">
        <div>
          <p className="neo-kicker">Colaboradores</p>
          <h2 className="neo-mega mt-5 text-[clamp(4.5rem,13vw,10rem)] text-[#cec6c2]">
            Partners
          </h2>
          <a className="neo-button-outline mt-7" href="/colaboradores">
            Ver colaboradores →
          </a>
        </div>

        <div className="grid border border-[#cec6c2]/14 md:grid-cols-3">
          {sponsors.slice(0, 3).map((sponsor, index) => (
            <article
              className="min-h-64 border-b border-[#cec6c2]/14 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              key={sponsor.id}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="neo-index">P/{String(index + 1).padStart(2, "0")}</span>
                {sponsor.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={sponsor.name} className="h-14 w-14 object-cover grayscale" src={sponsor.logoUrl} />
                ) : null}
              </div>
              <p className="mt-10 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#66615e]">
                {sponsor.category}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[#cec6c2]">{sponsor.name}</h3>
              <p className="mt-3 text-sm leading-6 text-[#837f7c]">{sponsor.description}</p>
              {sponsor.websiteUrl ? (
                <a
                  className="mt-5 inline-flex text-[10px] font-bold uppercase tracking-[0.12em] text-[#b7aaa4] transition hover:text-[#cec6c2]"
                  href={sponsor.websiteUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Visitar sitio ↗
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
