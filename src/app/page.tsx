import { getSiteContent, interpolateSiteText } from "@/lib/cms/site-content";
import { CommunityMemberForm } from "@/lib/community/member-form";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listPublishedReviews } from "@/lib/reviews/review";
import { listPublicSponsors } from "@/lib/sponsors/admin-sponsors";
import { PublicSponsorsSection } from "@/lib/sponsors/public-sponsors-section";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

async function getHomeReviews() {
  try {
    const firestore = getFirebaseAdminFirestore();
    return firestore ? await listPublishedReviews(firestore, 3) : [];
  } catch {
    return [];
  }
}

async function getHomeSponsors() {
  try {
    const firestore = getFirebaseAdminFirestore();
    return firestore ? await listPublicSponsors(firestore, 3) : [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const { siteSettings, home } = await getSiteContent();
  const reviews = await getHomeReviews();
  const sponsors = await getHomeSponsors();
  const whatsappUrl = hasWhatsAppConfig(siteSettings.whatsappPhone)
    ? buildWhatsAppUrl({ phone: siteSettings.whatsappPhone, message: siteSettings.whatsappMessage })
    : null;

  const primaryHref = home.primaryCtaHref || "/quote";
  const secondaryHref =
    home.secondaryCtaType === "whatsapp"
      ? whatsappUrl
      : home.secondaryCtaType === "link"
        ? home.secondaryCtaHref
        : null;

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 pb-20 pt-5 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden border border-[#cfff19]/20 bg-[#070707] px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] border-l border-[#cfff19]/12 bg-[linear-gradient(135deg,rgba(207,255,25,0.08),transparent_35%),radial-gradient(circle_at_center,rgba(207,255,25,0.08),transparent_55%)] lg:block" />
        <div className="pointer-events-none absolute right-[8%] top-[9%] hidden text-[11rem] font-black leading-none text-transparent [-webkit-text-stroke:1px_rgba(207,255,25,0.12)] lg:block">01</div>

        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <p className="neo-kicker">{interpolateSiteText(home.heroEyebrow, siteSettings)}</p>
            {home.heroKicker ? (
              <p className="mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                {interpolateSiteText(home.heroKicker, siteSettings)}
              </p>
            ) : null}
            <h1 className="neo-display mt-5 max-w-5xl text-[clamp(4rem,10vw,9.5rem)] leading-[0.82] text-white">
              {interpolateSiteText(home.heroTitle, siteSettings)}
            </h1>
            <div className="neo-rule mt-7 max-w-3xl" />
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              {interpolateSiteText(home.heroDescription, siteSettings)}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a className="neo-button" href={primaryHref}>
                {home.primaryCtaLabel} ↗
              </a>
              {secondaryHref ? (
                <a
                  className="neo-button-outline"
                  href={secondaryHref}
                  rel={secondaryHref.startsWith("http") ? "noreferrer" : undefined}
                  target={secondaryHref.startsWith("http") ? "_blank" : undefined}
                >
                  {home.secondaryCtaLabel}
                </a>
              ) : null}
            </div>
            {home.heroHint ? (
              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">{home.heroHint}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["01", "Idea", "Cuéntame qué quieres tatuar y comparte referencias."],
              ["02", "Evaluación", "Reviso zona, tamaño, composición y nivel de detalle."],
              ["03", "Agenda", "Si el proyecto es viable, coordinamos fecha y próximos pasos."],
            ].map(([number, title, description]) => (
              <article className="neo-panel-acid grid grid-cols-[auto_1fr] gap-4 p-4" key={number}>
                <span className="neo-index pt-1">{number}</span>
                <div>
                  <h2 className="neo-display text-2xl text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {home.sections.process ? (
        <section className="py-16 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="neo-kicker">{home.processSectionEyebrow}</p>
              <h2 className="neo-display mt-5 max-w-2xl text-[clamp(3rem,7vw,6.8rem)] leading-[0.88] text-white">
                {home.processSectionTitle}
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {home.processSectionSteps.map((step, index) => (
                <article className="neo-panel min-h-48 p-5" key={`${index}-${step}`}>
                  <span className="neo-index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="mt-6 h-px bg-[#cfff19]/25" />
                  <p className="mt-5 text-sm leading-7 text-zinc-300">{step}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {home.sections.reviews ? (
        <section className="border-y border-[#cfff19]/15 py-16 sm:py-20">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="neo-kicker">Opiniones</p>
              <h2 className="neo-display mt-4 text-[clamp(3rem,7vw,6rem)] leading-[0.88] text-white">Experiencias reales.</h2>
            </div>
            <a className="neo-button-outline" href="/opiniones">Ver opiniones →</a>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {reviews.length === 0 ? (
              <p className="neo-panel p-6 text-zinc-400 md:col-span-3">Aún no hay opiniones publicadas.</p>
            ) : (
              reviews.map((review, index) => (
                <article className="neo-panel p-6" key={review.id}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="neo-index">REV/{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-sm tracking-[0.12em] text-[#cfff19]">{"★".repeat(review.rating)}</span>
                  </div>
                  <p className="mt-7 line-clamp-5 text-sm leading-7 text-zinc-300">{review.comment}</p>
                  <p className="neo-display mt-6 text-xl text-white">{review.publicName}</p>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {home.sections.sponsors ? <PublicSponsorsSection sponsors={sponsors} /> : null}

      {home.sections.community ? (
        <section className="py-16 sm:py-20" id="comunidad">
          <div className="grid gap-8 border border-[#cfff19]/20 bg-[#080808] p-5 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="neo-kicker">Comunidad</p>
              <h2 className="neo-display mt-5 max-w-lg text-[clamp(3rem,7vw,5.5rem)] leading-[0.88] text-white">
                Agenda, novedades y contenido sin ruido.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-zinc-400">
                Puedes dejar tu correo para recibir información relevante. Esto no crea una reserva ni reemplaza la cotización.
              </p>
            </div>
            <CommunityMemberForm />
          </div>
        </section>
      ) : null}

      {home.sections.finalCta ? (
        <section className="pb-4 pt-6">
          <div className="relative overflow-hidden border border-[#cfff19] bg-[#cfff19] p-6 text-[#111500] sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute right-4 top-[-2.5rem] text-[9rem] font-black leading-none text-black/7 sm:text-[13rem]">GO</div>
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em]">Tu proyecto / siguiente paso</p>
                <h2 className="neo-display mt-4 max-w-4xl text-[clamp(3.2rem,8vw,7rem)] leading-[0.85]">
                  ¿Tienes una idea para tatuarte?
                </h2>
                <p className="mt-5 max-w-2xl text-sm font-semibold leading-7 text-black/70">
                  Envía una solicitud con idea, zona, tamaño, presupuesto y referencias. Después podrás seguir el estado con tu código de cotización.
                </p>
              </div>
              <a className="inline-flex min-h-12 items-center justify-center border border-black bg-black px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-[#cfff19] transition hover:-translate-y-0.5" href="/quote">
                Empezar cotización ↗
              </a>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
