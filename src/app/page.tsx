import { getSiteContent, interpolateSiteText } from "@/lib/cms/site-content";
import { CommunityMemberForm } from "@/lib/community/member-form";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { instagramMediaToPortfolioItems } from "@/lib/instagram/portfolio-adapter";
import { listPublicInstagramMedia } from "@/lib/instagram/instagram-media";
import { getFeaturedPortfolioItems } from "@/lib/portfolio/portfolio";
import { canUsePublicBackend } from "@/lib/portfolio/public-portfolio-backend";
import { listPublishedReviews } from "@/lib/reviews/review";
import { listPublicSponsors } from "@/lib/sponsors/admin-sponsors";
import { PublicSponsorsSection } from "@/lib/sponsors/public-sponsors-section";
import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";

const services = [
  "Línea fina y minimalista",
  "Blackwork y sombras suaves",
  "Diseños personalizados",
  "Cover-up evaluado caso a caso",
];

export const dynamic = "force-dynamic";

async function getHomePortfolioItems() {
  try {
    if (!(await canUsePublicBackend())) return getFeaturedPortfolioItems(3);

    const firestore = getFirebaseAdminFirestore();
    const instagramItems = firestore
      ? instagramMediaToPortfolioItems(await listPublicInstagramMedia(firestore, 12))
          .filter((item) => item.featured)
          .slice(0, 3)
      : [];

    return instagramItems.length > 0 ? instagramItems : getFeaturedPortfolioItems(3);
  } catch {
    return getFeaturedPortfolioItems(3);
  }
}

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
  const featuredPortfolioItems = await getHomePortfolioItems();
  const reviews = await getHomeReviews();
  const sponsors = await getHomeSponsors();
  const whatsappUrl = hasWhatsAppConfig(siteSettings.whatsappPhone)
    ? buildWhatsAppUrl({
        phone: siteSettings.whatsappPhone,
        message: siteSettings.whatsappMessage,
      })
    : null;
  const secondaryCtaHref =
    home.secondaryCtaType === "whatsapp" ? whatsappUrl : home.secondaryCtaHref;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-10 sm:py-10">
      <section className="relative isolate min-w-0 overflow-hidden rounded-[2rem] border border-amber-100/10 bg-[radial-gradient(circle_at_18%_12%,rgba(251,191,36,0.16),transparent_30%),linear-gradient(135deg,rgba(28,25,23,0.94),rgba(12,10,9,0.98)_58%,rgba(41,37,36,0.9))] px-4 py-8 shadow-2xl shadow-black/35 sm:rounded-[2.5rem] sm:px-8 sm:py-12 lg:px-10 lg:py-14">
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-2/3 bg-gradient-to-r from-amber-300/10 via-transparent to-transparent blur-2xl" />
        <div className="pointer-events-none absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-amber-200/25 to-transparent" />

        <div className="relative grid min-w-0 items-center gap-8 lg:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.74fr)] lg:gap-10">
          <div className="min-w-0 space-y-6 sm:space-y-8">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <p className="inline-flex w-fit max-w-full rounded-full border border-amber-200/20 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100 shadow-lg shadow-black/15 backdrop-blur sm:tracking-[0.28em]">
                {home.heroEyebrow}
              </p>
              <p className="text-sm font-medium text-stone-400">
                {interpolateSiteText(home.heroKicker, siteSettings)}
              </p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <h1 className="max-w-4xl text-balance break-words text-[clamp(2.08rem,7.2vw,4.25rem)] font-extrabold leading-[1.04] tracking-[-0.04em] text-stone-50 sm:leading-[0.98]">
                {home.heroTitle}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-stone-300 sm:text-lg sm:leading-8">
                {interpolateSiteText(home.heroDescription, siteSettings)}
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <a
                className="w-full rounded-full bg-amber-300 px-6 py-3 text-center font-semibold text-stone-950 shadow-xl shadow-amber-950/30 transition hover:-translate-y-0.5 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-stone-950 sm:w-auto"
                href={home.primaryCtaHref}
              >
                {home.primaryCtaLabel}
              </a>
              {home.secondaryCtaType !== "hidden" && secondaryCtaHref ? (
                <a
                  className="w-full rounded-full border border-amber-200/35 bg-white/[0.03] px-6 py-3 text-center font-semibold text-amber-100 shadow-lg shadow-black/15 transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-300 hover:text-stone-950 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-stone-950 sm:w-auto"
                  href={secondaryCtaHref}
                >
                  {home.secondaryCtaLabel}
                </a>
              ) : null}
              <span className="hidden text-sm text-stone-500 sm:inline sm:pl-2">
                {home.heroHint}
              </span>
            </div>
          </div>

          <aside
            className="relative min-w-0 pt-2 lg:pt-8"
            aria-label="Resumen del proceso de cotización"
          >
            <div className="pointer-events-none absolute -left-6 top-0 hidden h-24 w-24 rounded-full border border-amber-200/20 lg:block" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-6 lg:translate-y-5">
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-amber-200/10 blur-2xl" />
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-200">
                {home.processCardEyebrow}
              </p>
              <h2 className="mt-4 text-2xl font-black tracking-[-0.03em] text-stone-50">
                {home.processCardTitle}
              </h2>
              <p className="mt-3 hidden leading-7 text-stone-300 sm:block">
                {home.processCardSubtitle}
              </p>

              <dl className="mt-5 grid gap-3 text-sm text-stone-300 sm:mt-6 sm:grid-cols-3 lg:grid-cols-1">
                {home.processCardItems.map(({ term, description }, index) => (
                  <div
                    className="group grid grid-cols-[auto_1fr] gap-3 rounded-3xl border border-white/10 bg-stone-950/45 p-4 transition hover:border-amber-200/30 hover:bg-stone-900/70"
                    key={term}
                  >
                    <dt className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-200/25 bg-amber-200/10 text-xs font-black text-amber-100">
                      {index + 1}
                    </dt>
                    <dd>
                      <span className="block font-semibold text-stone-100">{term}</span>
                      <span className="mt-1 hidden leading-6 sm:block">{description}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </section>

      {home.sections.reviews ? (
        <section className="py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
                Opiniones
              </p>
              <h2 className="mt-3 text-3xl font-black text-stone-50">
                Experiencias moderadas y autorizadas.
              </h2>
            </div>
            <a
              className="rounded-full border border-amber-300/50 px-6 py-3 text-center font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
              href="/opiniones"
            >
              Ver opiniones
            </a>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {reviews.length === 0 ? (
              <p className="rounded-3xl border border-stone-800 bg-stone-950/70 p-6 text-stone-300 md:col-span-3">
                Aún no hay opiniones publicadas.
              </p>
            ) : (
              reviews.map((review) => (
                <article
                  className="rounded-3xl border border-stone-800 bg-stone-950/70 p-5"
                  key={review.id}
                >
                  <p className="text-amber-300">
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </p>
                  <p className="mt-3 line-clamp-4 text-sm leading-6 text-stone-300">
                    {review.comment}
                  </p>
                  <p className="mt-4 font-semibold text-stone-100">{review.publicName}</p>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {home.sections.portfolio ? (
        <section className="py-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
                Portafolio
              </p>
              <h2 className="mt-3 text-3xl font-black text-stone-50">
                Una muestra visual antes de cotizar.
              </h2>
              <p className="mt-3 max-w-2xl text-stone-300">
                Piezas y referencias curadas por estilo, zona y etiquetas para preparar mejor tu
                cotización.
              </p>
            </div>
            <a
              className="rounded-full border border-amber-300/50 px-6 py-3 text-center font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
              href="/portfolio"
            >
              Ver portafolio completo
            </a>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {featuredPortfolioItems.map((item) => (
              <article
                className="group overflow-hidden rounded-3xl border border-stone-800 bg-stone-950/70 shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-amber-300/40"
                key={item.id}
              >
                <div
                  className="relative h-40 overflow-hidden transition duration-500 group-hover:scale-105"
                  style={item.imageUrl ? undefined : { background: item.gradient }}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={item.title}
                      className="h-full w-full object-cover"
                      src={item.imageUrl}
                    />
                  ) : null}
                </div>
                <div className="space-y-3 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                    {item.style} · {item.bodyArea}
                  </p>
                  <h3 className="text-xl font-black text-stone-50">{item.title}</h3>
                  <p className="text-sm leading-6 text-stone-300">{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {home.sections.shop ? (
        <section className="py-10">
          <div className="grid gap-6 rounded-3xl border border-amber-100/10 bg-gradient-to-br from-stone-950/90 to-stone-900/60 p-6 shadow-xl shadow-black/20 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
                Obras disponibles
              </p>
              <h2 className="mt-3 text-3xl font-black text-stone-50">
                Flash y piezas listas para consultar.
              </h2>
            </div>
            <div className="space-y-4 text-stone-300">
              <p className="leading-7">
                Revisa obras disponibles y envía una solicitud breve. El sistema guarda el interés y
                prepara un mensaje de WhatsApp; la coordinación se confirma manualmente con el
                estudio.
              </p>
              <a
                className="inline-flex rounded-full border border-amber-300/50 px-6 py-3 font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
                href="/tienda"
              >
                Ver obras disponibles
              </a>
            </div>
          </div>
        </section>
      ) : null}

      {home.sections.sponsors ? <PublicSponsorsSection sponsors={sponsors} /> : null}

      {home.sections.services ? (
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
          <a
            className="mt-5 inline-flex rounded-full border border-amber-300/50 px-6 py-3 font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950 md:col-start-2"
            href="/servicios"
          >
            Ver servicios, cuidados y preguntas frecuentes
          </a>
        </section>
      ) : null}

      {home.sections.process ? (
        <section className="py-10" id="proceso">
          <div className="rounded-3xl border border-stone-700 bg-stone-950/70 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
              {home.processSectionEyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-black text-stone-50">{home.processSectionTitle}</h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {home.processSectionSteps.map((step, index) => (
                <li
                  className="rounded-2xl border border-stone-800 bg-stone-900/70 p-4 text-stone-300"
                  key={step}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-300/10 text-sm font-bold text-amber-300">
                    0{index + 1}
                  </span>
                  <p className="mt-2">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {home.sections.community ? (
        <section className="py-10" id="comunidad">
          <div className="grid gap-6 rounded-3xl border border-amber-100/10 bg-gradient-to-br from-stone-950/90 to-stone-900/60 p-6 shadow-xl shadow-black/20 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
                Comunidad
              </p>
              <h2 className="mt-3 text-3xl font-black text-stone-50">
                Recibe novedades del estudio sin llenar otra cotización.
              </h2>
              <p className="mt-3 leading-7 text-stone-300">
                Déjanos tu nombre y email para enterarte de contenido, agenda y novedades. Esto no
                crea campañas automáticas ni confirma una cita: solo guarda tu consentimiento de
                comunidad.
              </p>
            </div>
            <CommunityMemberForm />
          </div>
        </section>
      ) : null}

      {home.sections.contact ? (
        <section className="py-10">
          <div className="grid gap-6 rounded-3xl border border-stone-700 bg-stone-950/70 p-6 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
                Contacto
              </p>
              <h2 className="mt-3 text-3xl font-black text-stone-50">
                Atención por agenda y ubicación confirmada al reservar.
              </h2>
            </div>
            <div className="space-y-4 text-stone-300">
              <p className="leading-7">
                Prepara tu solicitud con idea, zona, tamaño y referencias. El estudio confirma
                próximos pasos, indicaciones de llegada y cuidados esperados cuando la cita queda
                coordinada.
              </p>
              <a
                className="inline-flex rounded-full border border-amber-300/50 px-6 py-3 font-semibold text-amber-100 transition hover:bg-amber-300 hover:text-stone-950"
                href="/contacto"
              >
                Ver contacto y ubicación
              </a>
            </div>
          </div>
        </section>
      ) : null}

      {home.sections.finalCta ? (
        <section className="py-10">
          <div className="flex flex-col gap-4 rounded-3xl border border-amber-300/30 bg-amber-300 p-6 text-stone-950 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-black">¿Tienes una idea para tatuarte?</h2>
              <p className="mt-2 max-w-2xl text-stone-800">
                Envía una cotización con datos concretos para revisar viabilidad, estilo y próximos
                pasos.
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
      ) : null}
    </main>
  );
}
