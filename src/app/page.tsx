import { getSiteContent, interpolateSiteText } from "@/lib/cms/site-content";
import { CommunityMemberForm } from "@/lib/community/member-form";
import { appConfig } from "@/lib/config/app";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { listPublicInstagramMedia, type InstagramMediaItem } from "@/lib/instagram/instagram-media";
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

async function getHomeInstagramMedia() {
  try {
    const firestore = getFirebaseAdminFirestore();
    if (!firestore) return [];
    const items = await listPublicInstagramMedia(firestore, 18);
    return items.filter(
      (item) => item.showOnHome && (item.mediaType !== "VIDEO" || item.thumbnailUrl),
    );
  } catch {
    return [];
  }
}

function getVisualUrl(item: InstagramMediaItem | undefined) {
  if (!item) return null;
  return item.thumbnailUrl || item.mediaUrl || null;
}

export default async function HomePage() {
  const { siteSettings, home } = await getSiteContent();
  const [reviews, sponsors, homeMedia] = await Promise.all([
    getHomeReviews(),
    getHomeSponsors(),
    getHomeInstagramMedia(),
  ]);

  const heroMedia = homeMedia.find((item) => item.pinned) ?? homeMedia[0];
  const secondaryMedia =
    homeMedia.find((item) => item.id !== heroMedia?.id && item.featured) ??
    homeMedia.find((item) => item.id !== heroMedia?.id);
  const tertiaryMedia = homeMedia.find(
    (item) => item.id !== heroMedia?.id && item.id !== secondaryMedia?.id,
  );
  const heroImageUrl = getVisualUrl(heroMedia);
  const editorialMedia = [secondaryMedia, tertiaryMedia].filter(
    (item): item is InstagramMediaItem => Boolean(item),
  );

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
        <section className="relative isolate min-h-[40rem] overflow-hidden border border-[#cec6c2]/14 bg-[#2c2c2c] sm:min-h-[47rem] lg:min-h-[52rem]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 top-5 z-0 overflow-hidden text-center font-[var(--font-display)] text-[clamp(5.7rem,20vw,18rem)] uppercase leading-[0.74] tracking-[-0.045em] text-[#cec6c2] sm:top-7"
          >
            Mario
          </div>

          {heroImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                aria-hidden="true"
                className="absolute bottom-0 left-1/2 z-[1] h-[68%] w-[min(84vw,720px)] -translate-x-1/2 object-cover object-center sm:h-[76%] lg:w-[min(50vw,720px)]"
                src={heroImageUrl}
              />
              <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(20,20,20,0.76)_0%,rgba(20,20,20,0.18)_42%,rgba(20,20,20,0.08)_62%,rgba(20,20,20,0.58)_100%),linear-gradient(0deg,rgba(20,20,20,0.78)_0%,transparent_42%)]" />
            </>
          ) : (
            <div
              aria-hidden="true"
              className="absolute bottom-0 left-1/2 z-[1] h-[68%] w-[min(70vw,580px)] -translate-x-1/2 border-x border-[#cec6c2]/12 bg-[radial-gradient(circle_at_50%_30%,rgba(206,198,194,0.16),transparent_35%),linear-gradient(180deg,rgba(55,8,3,0.52),rgba(16,16,16,0.94))]"
            />
          )}

          <div className="relative z-[3] flex min-h-[40rem] flex-col justify-between p-4 sm:min-h-[47rem] sm:p-6 lg:min-h-[52rem] lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <p className="neo-kicker">{interpolateSiteText(home.heroEyebrow, siteSettings)}</p>
              <div className="hidden text-right font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#b7aaa4] sm:block">
                <p>Realismo black & grey</p>
                <p className="mt-1">Diseño personalizado</p>
                <p className="mt-1">Chile / agenda</p>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.72fr)_minmax(20rem,1.28fr)] lg:items-end">
              <div className="max-w-md border-t border-[#cec6c2]/42 bg-[#141414]/55 p-4 backdrop-blur-sm sm:p-5">
                <h1 className="text-xl font-semibold leading-[1.2] text-[#e1dad6] sm:text-2xl">
                  {interpolateSiteText(home.heroTitle, siteSettings)}
                </h1>
                <p className="mt-3 text-sm leading-6 text-[#c5bbb6]">
                  {interpolateSiteText(home.heroDescription, siteSettings)}
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <a className="neo-button" href={primaryHref}>
                    {home.primaryCtaLabel}
                  </a>
                  {secondaryHref ? (
                    <a
                      className="neo-button-outline bg-[#141414]/35"
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
                <div className="w-full max-w-xs border-t border-[#cec6c2]/42 bg-[#141414]/42 p-4 text-right font-mono text-[9px] uppercase tracking-[0.13em] text-[#c5bbb6] backdrop-blur-sm">
                  <p>{appConfig.brandHandle}</p>
                  {home.heroKicker ? (
                    <p className="mt-2">{interpolateSiteText(home.heroKicker, siteSettings)}</p>
                  ) : null}
                  {home.heroHint ? <p className="mt-2 text-[#9a928e]">{home.heroHint}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="editorial-marquee mt-4">
        <div className="editorial-marquee-track">
          <span>Fine line focused</span><span>•</span><span>Custom designs</span><span>•</span>
          <span>Precise placement</span><span>•</span><span>Realismo black & grey</span><span>•</span>
          <span>Agenda personalizada</span><span>•</span><span>Fine line focused</span>
        </div>
      </div>

      {editorialMedia.length > 0 ? (
        <section className="editorial-page py-4" aria-label="Selección visual de Instagram">
          <div className={`grid overflow-hidden border border-[#cec6c2]/14 ${editorialMedia.length > 1 ? "md:grid-cols-2" : ""}`}>
            {editorialMedia.map((item, index) => (
              <a
                className="group relative min-h-[22rem] overflow-hidden border-b border-[#cec6c2]/14 last:border-b-0 md:min-h-[32rem] md:border-b-0 md:border-r md:last:border-r-0"
                href={item.permalink || siteSettings.instagramUrl || appConfig.instagramUrl}
                key={item.id}
                rel="noreferrer"
                target="_blank"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={item.caption || `Trabajo visual ${index + 1}`}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
                  src={getVisualUrl(item) ?? ""}
                />
                <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(20,20,20,0.86)_0%,rgba(20,20,20,0.08)_58%)]" />
                <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6">
                  <p className="font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-[#cec6c2]/70">
                    Instagram / {String(index + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-2 line-clamp-2 max-w-xl text-sm font-semibold leading-6 text-[#e1dad6]">
                    {item.description || item.caption}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {home.sections.process ? (
        <section className="editorial-strip py-14 sm:py-20">
          <div className="editorial-page">
            <div className="border-b border-[#cec6c2]/14 pb-7">
              <p className="neo-kicker">{home.processCardEyebrow}</p>
              <h2 className="neo-mega mt-6 text-[clamp(4.6rem,16vw,14rem)] text-[#cec6c2]">Client info</h2>
              <div className="mt-7 grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
                <div>
                  <h3 className="neo-display text-[clamp(2.3rem,5.6vw,4.5rem)] leading-[0.94] text-[#cec6c2]">
                    {home.processCardTitle}
                  </h3>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-[#9a928e]">{home.processCardSubtitle}</p>
                </div>
                <p className="text-right font-mono text-[9px] uppercase tracking-[0.14em] text-[#66615e]">
                  Antes de reservar / revisa cada punto
                </p>
              </div>
            </div>

            <div className={`grid border-x border-b border-[#cec6c2]/14 ${home.processCardItems.length >= 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
              {home.processCardItems.map((item, index) => (
                <article className="min-h-56 border-b border-[#cec6c2]/14 p-5 last:border-b-0 md:border-r md:last:border-r-0" key={`${item.term}-${index}`}>
                  <span className="neo-index">0{index + 1}</span>
                  <h3 className="mt-12 text-sm font-bold uppercase tracking-[0.1em] text-[#cec6c2]">{item.term}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#9a928e]">{item.description}</p>
                </article>
              ))}
            </div>

            <div className="mt-10 grid gap-7 border-t border-[#cec6c2]/14 pt-7 lg:grid-cols-[0.62fr_1.38fr]">
              <div>
                <p className="neo-kicker">{home.processSectionEyebrow}</p>
                <h3 className="neo-display mt-4 text-[clamp(2.3rem,5.6vw,4.3rem)] leading-[0.95] text-[#cec6c2]">{home.processSectionTitle}</h3>
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
                <h2 className="neo-mega mt-5 text-[clamp(4.3rem,12vw,9.5rem)] text-[#141414]">Experiences</h2>
                <a className="neo-button-dark mt-7" href="/opiniones">Ver todas →</a>
              </div>
              <div className="grid border border-[#141414]/16 md:grid-cols-3">
                {reviews.length === 0 ? (
                  <p className="p-6 text-sm text-[#370803]/70 md:col-span-3">Aún no hay opiniones publicadas.</p>
                ) : reviews.map((review, index) => (
                  <article className="min-h-64 border-b border-[#141414]/16 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0" key={review.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#370803]/60">REV/{String(index + 1).padStart(2, "0")}</span>
                      <span className="text-xs tracking-[0.08em] text-[#370803]">{"★".repeat(review.rating)}</span>
                    </div>
                    <p className="mt-12 line-clamp-5 text-sm leading-7 text-[#370803]/78">{review.comment}</p>
                    <p className="mt-5 text-xs font-bold uppercase tracking-[0.1em] text-[#141414]">{review.publicName}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {home.sections.sponsors ? <div className="editorial-page"><PublicSponsorsSection sponsors={sponsors} /></div> : null}

      {home.sections.community ? (
        <section className="editorial-strip py-14 sm:py-20" id="comunidad">
          <div className="editorial-page">
            <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
              <div>
                <p className="neo-kicker">Comunidad / newsletter</p>
                <h2 className="neo-mega mt-6 max-w-4xl text-[clamp(4rem,11vw,9rem)] text-[#cec6c2]">Novedades sin ruido.</h2>
                <p className="mt-6 max-w-md text-sm leading-7 text-[#9a928e]">Agenda, proyectos y contenido seleccionado. Dejar tu correo no crea una reserva ni reemplaza la cotización.</p>
              </div>
              <div className="border border-[#cec6c2]/16 bg-[#202020] p-5 sm:p-7"><CommunityMemberForm /></div>
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
                <h2 className="neo-mega mt-5 max-w-5xl text-[clamp(4rem,11vw,8.5rem)] text-[#141414]">Let&apos;s talk</h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-[#370803]/72">Si ya tienes una cotización o necesitas aclarar un paso, usa los canales oficiales del estudio.</p>
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
                <h2 className="neo-mega mt-5 max-w-5xl text-[clamp(4rem,12vw,9.5rem)] text-[#cec6c2]">Tu idea. Tu pieza.</h2>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-[#b7aaa4]">Completa la cotización con zona, tamaño, presupuesto y referencias. Luego podrás seguir el estado con tu código privado.</p>
              </div>
              <a className="neo-button" href="/quote">Empezar cotización →</a>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
