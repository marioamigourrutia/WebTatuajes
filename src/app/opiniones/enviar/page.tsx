import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";
import { ReviewForm } from "@/lib/reviews/review-form";

export default async function SubmitReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="05B"
          eyebrow="Opinión privada"
          title="Comparte tu experiencia."
          description="Este formulario funciona con un enlace privado de un solo uso generado por el estudio."
          tone="paper"
          meta={["Enlace privado", "Un solo uso", "Moderación"]}
        />

        <section className="mt-4 border border-[#cec6c2]/14 bg-[#202020] p-5 sm:p-7 lg:p-9">
          {token ? (
            <ReviewForm initialToken={token} />
          ) : (
            <p className="border border-red-300/30 bg-red-400/10 p-6 text-sm text-red-100">
              Falta el token privado de opinión.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
