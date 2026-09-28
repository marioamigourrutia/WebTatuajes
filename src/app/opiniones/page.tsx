import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";
import { listPublishedReviews } from "@/lib/reviews/review";

export const dynamic = "force-dynamic";

async function getReviews() {
  try {
    const firestore = getFirebaseAdminFirestore();
    return firestore ? await listPublishedReviews(firestore, 24) : [];
  } catch {
    return [];
  }
}

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="05"
          eyebrow="Opiniones / clientes"
          title="Experiencias publicadas por clientes."
          description="Solo mostramos opiniones autorizadas y moderadas por el estudio."
          tone="paper"
          meta={[`${reviews.length} publicadas`, "Moderadas", "Clientes reales"]}
        />

        <section className="mt-4 grid border border-[#cec6c2]/14 md:grid-cols-2 xl:grid-cols-3">
          {reviews.length === 0 ? (
            <div className="col-span-full min-h-64 p-6 sm:p-8">
              <p className="neo-kicker">Sin publicaciones</p>
              <p className="mt-14 max-w-xl text-lg leading-8 text-[#837f7c]">
                Todavía no hay opiniones publicadas.
              </p>
            </div>
          ) : (
            reviews.map((review, index) => (
              <article
                className="min-h-80 border-b border-[#cec6c2]/14 p-5 md:border-r xl:[&:nth-child(3n)]:border-r-0"
                key={review.id}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="neo-index">REV/{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-xs tracking-[0.08em] text-[#cec6c2]">
                    {"★".repeat(review.rating)}
                  </span>
                </div>
                <p className="mt-16 whitespace-pre-wrap text-sm leading-7 text-[#b7aaa4]">
                  {review.comment}
                </p>
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.12em] text-[#cec6c2]">
                  {review.publicName}
                </p>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
