import type { Metadata } from "next";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Uso de datos personales para cotizaciones, comunidad, tienda y reservas.",
};

const privacySections = [
  "Usamos tus datos para responder cotizaciones, coordinar reservas, gestionar compras, comunidad y seguimiento del servicio.",
  "Podemos tratar nombre, email, teléfono, descripción del proyecto, referencias, preferencias de contacto, abonos y mensajes operativos. No publiques datos sensibles innecesarios en enlaces de referencia.",
  "El sitio usa Firebase para autenticación admin y base operativa. Las referencias de cotización pública se envían por WhatsApp, no se suben al formulario. No vendemos tus datos.",
  "Conservamos la información mientras sea necesaria para atención, trazabilidad operativa y obligaciones legales. Puedes pedir acceso, corrección, eliminación o anonimización desde la página de solicitud de datos.",
];

export default function PrivacyPage() {
  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="L1"
          eyebrow="Legal / privacidad"
          title="Política de privacidad."
          description="Cómo se utilizan y protegen los datos personales vinculados a cotizaciones, reservas, comunidad y compras."
          tone="black"
          meta={["Datos personales", "Firebase", "Derechos del usuario"]}
        />

        <section className="mt-4 grid border border-[#cec6c2]/14 md:grid-cols-2">
          {privacySections.map((text, index) => (
            <article
              className="min-h-56 border-b border-[#cec6c2]/14 p-5 sm:p-7 md:border-r md:[&:nth-child(even)]:border-r-0 md:[&:nth-last-child(-n+2)]:border-b-0"
              key={text}
            >
              <span className="neo-index">0{index + 1}</span>
              <p className="mt-12 max-w-2xl text-sm leading-7 text-[#b7aaa4]">{text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
