import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
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
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <section className="rounded-[2rem] border border-amber-100/10 bg-stone-950/55 p-6 shadow-2xl shadow-black/30 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Colaboradores
        </p>
        <h1 className="mt-3 text-4xl font-black text-stone-50 sm:text-5xl">
          Marcas y aliados del estudio.
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-stone-300">
          Espacio para auspiciadores, proveedores y proyectos colaboradores relacionados con el
          mundo del tatuaje, el cuidado y la experiencia del estudio.
        </p>
      </section>

      <section className="py-10">
        {sponsors.length === 0 ? (
          <p className="rounded-3xl border border-stone-800 bg-stone-950/70 p-6 text-stone-300">
            Aún no hay colaboradores publicados.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {sponsors.map((sponsor) => (
              <article
                className="rounded-3xl border border-stone-800 bg-stone-950/70 p-5 shadow-xl shadow-black/20"
                key={sponsor.id}
              >
                {sponsor.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={sponsor.name}
                    className="mb-5 h-20 w-20 rounded-2xl object-cover"
                    src={sponsor.logoUrl}
                  />
                ) : null}
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                  {sponsor.category}
                </p>
                <h2 className="mt-2 text-2xl font-black text-stone-50">{sponsor.name}</h2>
                <p className="mt-4 text-sm leading-6 text-stone-300">{sponsor.description}</p>
                {sponsor.websiteUrl ? (
                  <a
                    className="mt-5 inline-flex rounded-full border border-amber-300/50 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
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
        )}
      </section>
    </main>
  );
}
