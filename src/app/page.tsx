import { getSiteContent, interpolateSiteText } from "@/lib/cms/site-content";
import { CommunityMemberForm } from "@/lib/community/member-form";
import { appConfig } from "@/lib/config/app";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { canUsePublicBackend, listPublicBackendPortfolioItems } from "@/lib/portfolio/public-portfolio-backend";
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

async function getHomePortfolioImage() {
  try {
    if (!(await canUsePublicBackend())) return null;
    const items = await listPublicBackendPortfolioItems();
    return items.find((item) => item.imageUrl)?.imageUrl ?? null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const { siteSettings, home } = await getSiteContent();
  const [reviews, sponsors, heroImageUrl] = await Promise.all([
    getHomeReviews(),
    getHomeSponsors(),
    getHomePortfolioImage(),
  ]);
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
    <main className="pb-0 pt-4 sm:pt-5">
      <div className="editorial-page">
        <section className="relative isolate min-h-[42rem] overflow-hidden border border-[#cec6c2]/14 bg-[#2c2c2c] sm:min-h-[48rem] lg:min-h-[52rem]">
          <div
            className="pointer-events-none absolute inset-x-3 top-5 z-0 text-center font-[var(--font-display)] text-[clamp(7.5rem,21vw,19rem)] uppercase leading-[0.72] tracking-[-0.045em] text-[#cec6c2] sm:top-7"
            aria-hidden="true"
          >
            Mario
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[29%] z-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(20,20,20,0.08)_40%,rgba(20,20,20,0.34)_100%)]" />

          {heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              aria-hidden="true"
              className="absolute bottom-0 left-1/2 z-[1] h-[72%] w-[min(70vw,640px)] -translate-x-1/2 object-cover object-center grayscale-[0.15] contrast-[1.03] sm:h-[78%] lg:w-[min(48vw,680px)]"
              src={heroImageUrl}
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-1/2 z-[1] h-[68%] w-[min(64vw,560px)] -translate-x-1/2 border-x border-[#cec6c2]/12 bg-[radial-gradient(circle_at_50%_30%,rgba(206,198,194,0.16),transparent_35%),linear-gradient(180deg,rgba(55,8,3,0.52),rgba(16,16,16,0.94))]"
            />
          )}

          <div className="relative z-[3] flex min-h-[42rem] flex-col justify-between p-4 sm:min-h-[48rem] sm:p-6 lg:min-h-[52rem] lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <p className="neo-kicker">{interpolateSiteText(home.heroEyebrow, siteSettings)}</p>
              <div className="hidden text-right font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#b7aaa4] sm:block">
                <p>Realismo black & grey</p>
                <p className="mt-1">Diseño personalizado</p>
                <p className="mt-1">Chile / agenda</p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(20rem,1.28fr)] lg:items-end">
              <div className="max-w-sm border-t border-[#cec6c2]/36 pt-4 backdrop-blur-[2px]">
                <h1 className="text-xl font-semibold leading-tight text-[#cec6c2] sm:text-2xl">
                  {interpolateSiteText(home.heroTitle, siteSettings)}
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#b7aaa4]">
                  {interpolateSiteText(home.heroDescription, siteSettings)}
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <a className="neo-button" href={primaryHref}>
                    {home.primaryCtaLabel}
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
              </div>

              <div className="flex justify-end">
                <div className="w-full max-w-xs border-t border-[#cec6c2]/36 pt-4 text-right font-mono text-[9px] uppercase tracking-[0.13em] text-[#b7aaa4]">
                  <p>{appConfig.brandHandle}</p>
                  {home.heroKicker ? (
                    <p className="mt-2">{interpolateSiteText(home.heroKicker, siteSettings)}</p>
                  ) : null}
                  {home.heroHint ? <p className="mt-2 text-[#837f7c]">{home.heroHint}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="editorial-marquee mt-4">
        <div className="editorial-marquee-track">
          <span>Fine line focused</span>
          <span>•</span>
          <span>Custom designs</span>
          <span>•</span>
          <span>Precise placement</span>
          <span>•</span>
          <span>Realismo black & grey</span>
          <span>•</span>
          <span>Agenda personalizada</span>
          <span>•</span>
          <span>Fine line focused</span>
        </div>
      </div>

      {home.sections.process ? (
        <section className="editorial-strip py-14 sm:py-20">
          <div className="editorial-page">
            <div className="border-b border-[#cec6c2]/14 pb-7">
              <p className="neo-kicker">{home.processCardEyebrow}</p>
              <h2 className="neo-mega mt-6 text-[clamp(5.5rem,18vw,15rem)] text-[#cec6c2]">
                Client info
              </h2>
              <div className="mt-7 grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
                <div>
                  <h3 className="neo-display text-[clamp(2.4rem,6vw,4.8rem)] text-[#cec6c2]">
                    {home.processCardTitle}
                  </h3>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-[#837f7c]">{home.processCardSubtitle}</p>
                </div>
                <p className="text-right font-mono text-[9px] uppercase tracking-[0.14em] text-[#66615e]">
                  Antes de reservar / revisa cada punto
                </p>
              </div>
            </div>

            <div className={`grid border-x border-b border-[#cec6c2]/14 ${home.processCardItems.length >= 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
              {home.processCardItems.map((item, index) => (
                <article
                  className="min-h-56 border-b border-[#cec6c2]/14 p-5 last:border-b-0 md:border-r md:last:border-r-0"
                  key={`${item.term}-${index}`}
                >
                  <span className="neo-index">0{index + 1}</span>
                  <h3 className="mt-12 text-sm font-bold uppercase tracking-[0.1em] text-[#cec6c2]">{item.term}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#837f7c]">{item.description}</p>
                </article>
              ))}
            </div>

            <div className="mt-10 grid gap-7 border-t border-[#cec6c2]/14 pt-7 lg:grid-cols-[0.62fr_1.38fr]">
              <div>
                <p className="neo-kicker">{home.processSectionEyebrow}</p>
                <h3 className="neo-display mt-4 text-[clamp(2.4rem,6vw,4.5rem)] text-[#cec6c2]">
                  {home.processSectionTitle}
                </h3>
              </div>
              <div className="divide-y divide-[#cec6c2]/14 border-y border-[#cec6c2]/14">
                {home.processSectionSteps.map((step, index) => (
                  <div className="grid grid-cols-[auto_1fr_auto] gap-4 py-4" key={`${index}-${step}`}>
                    <span className="neo-index">{String(index + 1).padStart(2, "0")}</span>
                    <p className="text-sm leading-6 text-[#b7aaa4]">{step}</p>
                    <span className="text-[#66615e]">→</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {home.sections.reviews ? (
        <section className="editorial-strip-paper py-14 sm:py-20">
          <div className="editorial-page">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <div>
                <p className="neo-kicker !text-[#370803]">Opiniones</p>
                <h2 className="neo-mega mt-5 text-[clamp(4.5rem,13vw,10rem)] text-[#141414]">
                  Experiences
                </h2>
                <a className="neo-button-dark mt-7" href="/opiniones">
                  Ver todas →
                </a>
              </div>

              <div className="grid border border-[#141414]/16 md:grid-cols-3">
                {reviews.length === 0 ? (
                  <p className="p-6 text-sm text-[#370803]/70 md:col-span-3">Aún no hay opiniones publicadas.</p>
                ) : (
                  reviews.map((review, index) => (
                    <article
                      className="min-h-64 border-b border-[#141414]/16 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                      key={review.id}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#370803]/60">
                          REV/{String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-xs tracking-[0.08em] text-[#370803]">{"★".repeat(review.rating)}</span>
                      </div>
                      <p className="mt-12 line-clamp-5 text-sm leading-7 text-[#370803]/78">{review.comment}</p>
                      <p className="mt-5 text-xs font-bold uppercase tracking-[0.1em] text-[#141414]">{review.publicName}</p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {home.sections.sponsors ? (
        <div className="editorial-page">
          <PublicSponsorsSection sponsors={sponsors} />
        </div>
      ) : null}

      {home.sections.community ? (
        <section className="editorial-strip py-14 sm:py-20" id="comunidad">
          <div className="editorial-page">
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
              <div>
                <p className="neo-kicker">Comunidad / newsletter</p>
                <h2 className="neo-mega mt-6 max-w-4xl text-[clamp(4.2rem,12vw,9.5rem)] text-[#cec6c2]">
                  Novedades sin ruido.
                </h2>
                <p className="mt-6 max-w-md text-sm leading-7 text-[#837f7c]">
                  Agenda, proyectos y contenido seleccionado. Dejar tu correo no crea una reserva ni reemplaza la cotización.
                </p>
              </div>
              <div className="border border-[#cec6c2]/16 bg-[#202020] p-5 sm:p-7">
                <CommunityMemberForm />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {home.sections.contact ? (
        <section className="editorial-strip-paper py-12 sm:py-16">
          <div className="editorial-page">
            <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="neo-kicker !text-[#370803]">Contacto</p>
                <h2 className="neo-mega mt-5 max-w-5xl text-[clamp(4rem,12vw,9rem)] text-[#141414]">
                  Let&apos;s talk
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-[#370803]/72">
                  Si ya tienes una cotización o necesitas aclarar un paso, usa los canales oficiales del estudio.
                </p>
              </div>
              <a className="neo-button-dark" href="/contacto">Ir a contacto →</a>
            </div>
          </div>
        </section>
      ) : null}

      {home.sections.finalCta ? (
        <section className="editorial-strip-wine py-12 sm:py-16">
          <div className="editorial-page">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="neo-kicker">Tu proyecto / siguiente paso</p>
                <h2 className="neo-mega mt-5 max-w-5xl text-[clamp(4rem,13vw,10rem)] text-[#cec6c2]">
                  Tu idea. Tu pieza.
                </h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#b7aaa4]">
                  Completa la cotización con zona, tamaño, presupuesto y referencias. Luego podrás seguir el estado con tu código privado.
                </p>
              </div>
              <a className="neo-button" href="/quote">
                Empezar cotización →
              </a>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
