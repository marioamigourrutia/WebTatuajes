import type { Metadata } from "next";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";

export const metadata: Metadata = {
  title: "Solicitud de datos",
  description: "Proceso para pedir acceso, corrección, eliminación o anonimización de datos.",
};

const requests = [
  "Para pedir acceso, corrección, eliminación o anonimización, escribe al estudio por WhatsApp o por el canal oficial e incluye el email usado, código de cotización o compra si lo tienes, y el tipo de solicitud.",
  "El estudio validará tu identidad antes de modificar información. Algunos registros operativos pueden conservarse anonimizados para trazabilidad, seguridad o cumplimiento legal.",
  "Si tu solicitud involucra imágenes, indica cuáles deben eliminarse o reemplazarse para evitar borrar material equivocado.",
];

export default function DataRequestPage() {
  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="L3"
          eyebrow="Datos personales / derechos"
          title="Solicitud de datos."
          description="Proceso para pedir acceso, corrección, eliminación o anonimización de información personal."
          tone="paper"
          meta={["Acceso", "Corrección", "Eliminación"]}
        />

        <section className="mt-4 grid border border-[#cec6c2]/14 md:grid-cols-3">
          {requests.map((text, index) => (
            <article
              className="min-h-64 border-b border-[#cec6c2]/14 p-5 sm:p-7 md:border-b-0 md:border-r md:last:border-r-0"
              key={text}
            >
              <span className="neo-index">0{index + 1}</span>
              <p className="mt-14 text-sm leading-7 text-[#b7aaa4]">{text}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
