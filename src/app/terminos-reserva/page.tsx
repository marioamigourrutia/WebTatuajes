import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos de reserva",
  description: "Condiciones básicas de cotización, abono y confirmación de fechas.",
};

export default function ReservationTermsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-10">
      <section className="rounded-[2rem] border border-amber-100/10 bg-stone-950/70 p-6 text-stone-300 shadow-2xl shadow-black/25 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Reservas</p>
        <h1 className="mt-3 text-4xl font-black text-stone-50">Términos de reserva</h1>
        <div className="mt-6 space-y-5 leading-7">
          <p>Una cotización no confirma automáticamente una cita. La fecha solicitada queda pendiente hasta que el estudio revise el proyecto y confirme disponibilidad.</p>
          <p>Cuando corresponda, el abono se registra como respaldo de la reserva. La fecha queda confirmada solo después de validación administrativa.</p>
          <p>Los cambios de fecha, cancelaciones o ajustes de alcance se coordinan directamente con el estudio por los canales oficiales.</p>
        </div>
      </section>
    </main>
  );
}
