"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { reviewModerationStatuses, type ReviewModerationStatus } from "./review-constants";

type AdminReview = {
  id: string;
  rating: number;
  comment: string;
  publicName: string;
  moderationStatus: ReviewModerationStatus;
  publishConsent: boolean;
  quoteId: string | null;
  customerEmail: string | null;
  createdAt: string | null;
};

const labels: Record<ReviewModerationStatus, string> = {
  pending: "Pendiente",
  published: "Publicada",
  rejected: "Rechazada",
  hidden: "Oculta",
};

export function AdminReviewsPanel({ enabled }: { enabled: boolean }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function getAdminToken() {
    if (!user) throw new Error("Inicia sesión antes de administrar opiniones.");
    return user.getIdToken();
  }

  async function loadReviews() {
    if (!enabled || !user) return;
    setLoading(true);
    setError(null);
    try {
      const idToken = await getAdminToken();
      const response = await fetch("/api/admin/reviews", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const body = (await response.json()) as { reviews?: AdminReview[]; error?: string };
      if (!response.ok) {
        setError(body.error ?? "No se pudieron listar las opiniones.");
        setReviews([]);
        return;
      }
      setReviews(body.reviews ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadReviews);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, user]);

  async function generateToken(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setGeneratedLink(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const idToken = await getAdminToken();
    const response = await fetch("/api/admin/reviews/tokens", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteId: formData.get("quoteId"),
        customerEmail: formData.get("customerEmail"),
        expiresAt: formData.get("expiresAt"),
      }),
    });
    const body = (await response.json()) as { link?: string; errors?: Record<string, string> };
    if (!response.ok || !body.link) {
      setError(Object.values(body.errors ?? {})[0] ?? "No se pudo generar el enlace.");
      return;
    }
    setGeneratedLink(body.link);
    setNotice("Enlace privado generado. Cópialo y envíalo manualmente al cliente.");
    form.reset();
  }

  async function moderateReview(reviewId: string, moderationStatus: ReviewModerationStatus) {
    setError(null);
    setNotice(null);
    const idToken = await getAdminToken();
    const response = await fetch("/api/admin/reviews/moderation", {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, moderationStatus }),
    });
    const body = (await response.json()) as {
      moderationStatus?: ReviewModerationStatus;
      error?: string;
    };
    if (!response.ok || !body.moderationStatus) {
      setError(body.error ?? "No se pudo moderar la opinión.");
      return;
    }
    setReviews((current) =>
      current.map((review) =>
        review.id === reviewId
          ? { ...review, moderationStatus: body.moderationStatus ?? review.moderationStatus }
          : review,
      ),
    );
    setNotice("Estado de moderación actualizado. El texto y estrellas no se editan desde admin.");
  }

  if (!enabled) return null;

  return (
    <section className="space-y-4 rounded-3xl border border-stone-800 bg-stone-900/50 p-5">
      <div>
        <h3 className="text-xl font-bold text-stone-50">Opiniones y moderación</h3>
        <p className="mt-1 text-sm text-stone-400">
          Genera enlaces privados de una sola vez y modera publicación sin editar texto ni
          estrellas.
        </p>
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-300">{notice}</p> : null}
      <form
        className="grid gap-3 rounded-2xl border border-stone-800 bg-stone-950/70 p-4 md:grid-cols-3"
        onSubmit={generateToken}
      >
        <input
          className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
          name="quoteId"
          placeholder="ID cotización opcional"
        />
        <input
          className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
          name="customerEmail"
          placeholder="Email cliente/manual"
          type="email"
        />
        <input
          className="rounded-xl border border-stone-700 bg-stone-900 px-3 py-2 text-stone-100"
          name="expiresAt"
          type="datetime-local"
        />
        <button
          className="rounded-full bg-amber-300 px-4 py-2 font-semibold text-stone-950 md:col-span-3"
          type="submit"
        >
          Generar enlace privado
        </button>
      </form>
      {generatedLink ? (
        <input
          className="w-full rounded-xl border border-amber-300/40 bg-stone-950 px-3 py-2 text-amber-100"
          readOnly
          value={generatedLink}
        />
      ) : null}
      <div className="space-y-3">
        {loading ? <p className="text-sm text-stone-400">Cargando opiniones…</p> : null}
        {reviews.map((review) => (
          <article
            className="rounded-2xl border border-stone-800 bg-stone-950/70 p-4"
            key={review.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-stone-100">
                {review.publicName} · {review.rating}/5
              </p>
              <span className="rounded-full border border-amber-300/30 px-3 py-1 text-xs text-amber-100">
                {labels[review.moderationStatus]}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-300">
              {review.comment}
            </p>
            <p className="mt-2 text-xs text-stone-500">
              {review.customerEmail ?? "sin email"} · {review.quoteId ?? "sin cotización"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {reviewModerationStatuses.map((status) => (
                <button
                  className="rounded-full border border-stone-700 px-3 py-1 text-xs text-stone-200 hover:border-amber-300"
                  disabled={review.moderationStatus === status}
                  key={status}
                  onClick={() => void moderateReview(review.id, status)}
                  type="button"
                >
                  {labels[status]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
