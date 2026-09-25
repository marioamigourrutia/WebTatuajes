import type { Metadata } from "next";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";

export const metadata: Metadata = {
  title: "Manejo de imágenes",
  description: "Criterios de recepción, almacenamiento y uso de imágenes de referencia.",
};

const imageGuidelines = [
  "Envía imágenes solo si aportan contexto al diseño. Prefiere referencias de estilo, composición o inspiración sin datos personales.",
  "Las fotos corporales sensibles deben compartirse únicamente por el canal privado acordado con el estudio, salvo que el sitio indique almacenamiento privado habilitado.",
  "Las imágenes se usan para evaluar la cotización y coordinar el trabajo. Puedes solicitar eliminación o anonimización mediante la página de solicitud de datos.",
];

export default function ImageHandlingPage() {
  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="L4"
          eyebrow="Imágenes / privacidad"
          title="Manejo de imágenes."
          description="Criterios para compartir referencias visuales y material sensible durante una cotización o proyecto."
          tone="black"
          meta={["Referencias", "Privacidad", "Eliminación"]}
        />

        <section className="mt-4 grid border border-[#cec6c2]/14 md:grid-cols-3">
          {imageGuidelines.map((text, index) => (
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
