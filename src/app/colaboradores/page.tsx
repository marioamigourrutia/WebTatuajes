import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";
import { listPublicSponsors } from "@/lib/sponsors/admin-sponsors";

export const dynamic = "force-dynamic";

async function getSponsors() {
  try {
    const firestore = getFirebaseAdminFirestore();
    return firestore ? await listPublicSponsors(firestore, 50) : [];
  } catch {
    return [];
  }
}

export default async function SponsorsPage() {
  const sponsors = await getSponsors();

  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="07"
          eyebrow="Colaboradores / aliados"
          title="Marcas y aliados del estudio."
          description="Auspiciadores, proveedores y proyectos colaboradores relacionados con el tatuaje, el cuidado y la experiencia del estudio."
          meta={[`${sponsors.length} activos`, "Partners", "Selección pública"]}
        />

        <section className="mt-4 grid border border-[#cec6c2]/14 md:grid-cols-2 xl:grid-cols-3">
          {sponsors.length === 0 ? (
            <div className="col-span-full min-h-64 p-6 sm:p-8">
              <p className="neo-kicker">Sin colaboradores</p>
              <p className="mt-14 max-w-xl text-lg leading-8 text-[#837f7c]">
                Aún no hay colaboradores publicados.
              </p>
            </div>
          ) : (
            sponsors.map((sponsor, index) => (
              <article
                className="min-h-80 border-b border-[#cec6c2]/14 p-5 md:border-r xl:[&:nth-child(3n)]:border-r-0"
                key={sponsor.id}
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="neo-index">P/{String(index + 1).padStart(2, "0")}</span>
                  {sponsor.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={sponsor.name}
                      className="h-20 w-20 object-cover grayscale"
                      src={sponsor.logoUrl}
                    />
                  ) : null}
                </div>
                <p className="mt-12 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#66615e]">
                  {sponsor.category}
                </p>
                <h2 className="neo-display mt-2 text-3xl text-[#cec6c2]">{sponsor.name}</h2>
                <p className="mt-4 text-sm leading-7 text-[#837f7c]">{sponsor.description}</p>
                {sponsor.websiteUrl ? (
                  <a
                    className="mt-6 inline-flex text-[10px] font-bold uppercase tracking-[0.12em] text-[#b7aaa4] transition hover:text-[#cec6c2]"
                    href={sponsor.websiteUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Visitar sitio ↗
                  </a>
                ) : null}
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
