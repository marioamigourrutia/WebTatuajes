import type { Metadata } from "next";
import { EditorialPageHero } from "@/lib/layout/editorial-page-hero";

export const metadata: Metadata = {
  title: "Términos de reserva",
  description: "Condiciones básicas de cotización, abono y confirmación de fechas.",
};

const terms = [
  "Una cotización no confirma automáticamente una cita. La fecha solicitada queda pendiente hasta que el estudio revise el proyecto y confirme disponibilidad.",
  "Cuando corresponda, el abono se registra como respaldo de la reserva. La fecha queda confirmada solo después de validación administrativa.",
  "Los cambios de fecha, cancelaciones o ajustes de alcance se coordinan directamente con el estudio por los canales oficiales.",
];

export default function ReservationTermsPage() {
  return (
    <main className="pb-8 pt-4 sm:pt-5">
      <div className="editorial-page">
        <EditorialPageHero
          index="L2"
          eyebrow="Legal / reservas"
          title="Términos de reserva."
          description="Condiciones básicas para cotizaciones, fechas, abonos y confirmaciones de agenda."
          tone="wine"
          meta={["Cotización", "Abono", "Confirmación"]}
        />

        <section className="mt-4 grid border border-[#cec6c2]/14 md:grid-cols-3">
          {terms.map((text, index) => (
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
