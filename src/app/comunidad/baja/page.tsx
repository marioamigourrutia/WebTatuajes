import { CommunityUnsubscribeForm } from "@/lib/community/unsubscribe-form";

export default function CommunityUnsubscribePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-stone-400">
          Comunidad WebTatuajes
        </p>
        <h1 className="text-3xl font-bold text-stone-50">Cancelar comunicaciones</h1>
        <p className="text-stone-300">
          Ingresa tu email y confirma la solicitud. Por privacidad, siempre mostraremos una
          respuesta genérica y no confirmaremos si el correo existe en nuestra comunidad.
        </p>
      </div>

      <section className="rounded-3xl border border-stone-800 bg-stone-900/70 p-5">
        <CommunityUnsubscribeForm />
      </section>
    </main>
  );
}
