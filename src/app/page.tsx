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
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-8 sm:pt-10 lg:px-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0a0c] px-5 py-10 shadow-[0_28px_90px_rgba(0,0,0,0.34)] sm:px-8 sm:py-14 lg:px-12 lg:py-16">
        <div className="pointer-events-none absolute right-[-8rem] top-[-10rem] h-80 w-80 rounded-full bg-white/[0.035] blur-3xl" />
        <div className="relative max-w-4xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">
            {interpolateSiteText(home.heroEyebrow, siteSettings)}
          </p>
          {home.heroKicker ? (
            <p className="mt-3 text-sm font-semibold text-zinc-400">
              {interpolateSiteText(home.heroKicker, siteSettings)}
            </p>
          ) : null}
          <h1 className="mt-5 max-w-4xl text-balance text-[clamp(2.65rem,7vw,5.3rem)] font-black leading-[0.96] tracking-[-0.055em] text-white">
            {interpolateSiteText(home.heroTitle, siteSettings)}
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
            {interpolateSiteText(home.heroDescription, siteSettings)}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-[#151518] px-6 py-3.5 font-bold text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-white/35 hover:bg-zinc-900"
              href={primaryHref}
            >
              {home.primaryCtaLabel}
            </a>
            {secondaryHref ? (
              <a
                className="inline-flex items-center justify-center rounded-full border border-white/12 px-6 py-3.5 font-semibold text-zinc-300 transition hover:border-white/25 hover:text-white"
                href={secondaryHref}
                rel={secondaryHref.startsWith("http") ? "noreferrer" : undefined}
                target={secondaryHref.startsWith("http") ? "_blank" : undefined}
              >
                {home.secondaryCtaLabel}
              </a>
            ) : null}
          </div>
          {home.heroHint ? <p className="mt-4 text-sm text-zinc-500">{home.heroHint}</p> : null}
        </div>
      </section>

      {home.sections.process ? (
        <section className="py-16">
          <div className="border-b border-white/10 pb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">
              {home.processSectionEyebrow}
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">
              {home.processSectionTitle}
            </h2>
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {home.processSectionSteps.map((step, index) => (
              <article className="border-t border-white/10 pt-5" key={`${index}-${step}`}>
                <span className="text-[10px] font-black tracking-[0.2em] text-zinc-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 text-sm leading-7 text-zinc-300">{step}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {home.sections.reviews ? (
        <section className="py-16">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">Opiniones</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">Experiencias de clientes.</h2>
            </div>
            <a className="text-sm font-semibold text-zinc-400 transition hover:text-white" href="/opiniones">Ver todas las opiniones →</a>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {reviews.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-[#0b0b0d] p-6 text-zinc-400 md:col-span-3">Aún no hay opiniones publicadas.</p>
            ) : reviews.map((review) => (
              <article className="rounded-2xl border border-white/10 bg-[#0b0b0d] p-6" key={review.id}>
                <p className="text-sm tracking-[0.12em] text-zinc-300">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                <p className="mt-4 line-clamp-5 text-sm leading-7 text-zinc-300">{review.comment}</p>
                <p className="mt-5 text-sm font-bold text-zinc-100">{review.publicName}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {home.sections.sponsors ? <PublicSponsorsSection sponsors={sponsors} /> : null}

      {home.sections.community ? (
        <section className="py-16" id="comunidad">
          <div className="grid gap-10 border-y border-white/10 py-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">Comunidad</p>
              <h2 className="mt-3 max-w-md text-3xl font-black tracking-[-0.03em] text-white sm:text-4xl">Agenda, novedades y contenido sin ruido.</h2>
              <p className="mt-4 max-w-md text-sm leading-7 text-zinc-400">Puedes dejar tu correo para recibir información relevante. Esto no crea una reserva ni reemplaza la cotización.</p>
            </div>
            <CommunityMemberForm />
          </div>
        </section>
      ) : null}

      {home.sections.finalCta ? (
        <section className="pb-6 pt-10">
          <div className="grid gap-6 rounded-[2rem] border border-white/12 bg-[#0b0b0d] p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-zinc-500">Tu proyecto</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-white">¿Tienes una idea para tatuarte?</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">Envía una solicitud con idea, zona, tamaño, presupuesto y referencias. Después podrás seguir el estado con tu código de cotización.</p>
            </div>
            <a className="inline-flex items-center justify-center rounded-full border border-white/20 bg-[#151518] px-6 py-3.5 font-bold text-zinc-100 transition hover:border-white/35 hover:bg-zinc-900" href="/quote">Empezar cotización</a>
          </div>
        </section>
      ) : null}
    </main>
  );
}
