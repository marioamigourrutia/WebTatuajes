import { CommunityUnsubscribeForm } from "@/lib/community/unsubscribe-form";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";

export default function CommunityUnsubscribePage() {
  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="06B"
          eyebrow="Comunidad / privacidad"
          title="Cancelar comunicaciones."
          description="Ingresa tu email y confirma la solicitud. Por privacidad, siempre mostraremos una respuesta genérica y no confirmaremos si el correo existe en nuestra comunidad."
          tone="black"
          meta={["Baja segura", "Respuesta genérica", "Privacidad"]}
        />

        <section className="mt-4 border border-[#cec6c2]/14 bg-[#202020] p-5 sm:p-7 lg:p-9">
          <p className="neo-kicker">Unsubscribe</p>
          <h2 className="neo-display mt-4 text-[clamp(2.7rem,7vw,5rem)] text-[#cec6c2]">
            Solicitar baja
          </h2>
          <div className="mt-7 max-w-2xl">
            <CommunityUnsubscribeForm />
          </div>
        </section>
      </div>
    </main>
  );
}
