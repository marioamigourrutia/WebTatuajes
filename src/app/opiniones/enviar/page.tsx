import { ReviewForm } from "@/lib/reviews/review-form";

export default async function SubmitReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10">
      <section className="mb-6 rounded-[2rem] border border-amber-100/10 bg-stone-950/60 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">
          Opinión privada
        </p>
        <h1 className="mt-3 text-4xl font-black text-stone-50">Comparte tu experiencia</h1>
        <p className="mt-4 text-stone-300">
          Este formulario funciona con un enlace privado de un solo uso generado por el estudio.
        </p>
      </section>
      {token ? (
        <ReviewForm initialToken={token} />
      ) : (
        <p className="rounded-3xl border border-red-300/30 bg-red-400/10 p-6 text-red-100">
          Falta el token privado de opinión.
        </p>
      )}
    </main>
  );
}
