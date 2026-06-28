import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
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
    <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
      <section className="rounded-[2rem] border border-amber-100/10 bg-stone-950/60 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Opiniones</p>
        <h1 className="mt-3 text-4xl font-black text-stone-50">
          Experiencias publicadas por clientes.
        </h1>
        <p className="mt-4 max-w-2xl text-stone-300">
          Solo mostramos opiniones autorizadas y moderadas por el estudio.
        </p>
      </section>
      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {reviews.length === 0 ? (
          <p className="rounded-3xl border border-stone-800 bg-stone-950/70 p-6 text-stone-300 md:col-span-3">
            Todavía no hay opiniones publicadas.
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
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-300">
                {review.comment}
              </p>
              <p className="mt-4 font-semibold text-stone-100">{review.publicName}</p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
