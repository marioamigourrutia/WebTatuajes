import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Uso de datos personales para cotizaciones, comunidad, tienda y reservas.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-10">
      <section className="rounded-[2rem] border border-amber-100/10 bg-stone-950/70 p-6 text-stone-300 shadow-2xl shadow-black/25 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-300">Privacidad</p>
        <h1 className="mt-3 text-4xl font-black text-stone-50">Política de privacidad</h1>
        <div className="mt-6 space-y-5 leading-7">
          <p>Usamos tus datos para responder cotizaciones, coordinar reservas, gestionar compras, comunidad y seguimiento del servicio.</p>
          <p>Podemos tratar nombre, email, teléfono, descripción del proyecto, referencias, preferencias de contacto, abonos y mensajes operativos. No publiques datos sensibles innecesarios en enlaces de referencia.</p>
          <p>El sitio usa Firebase para autenticación admin y base operativa. Las referencias de cotización pública se envían por WhatsApp, no se suben al formulario. No vendemos tus datos.</p>
          <p>Conservamos la información mientras sea necesaria para atención, trazabilidad operativa y obligaciones legales. Puedes pedir acceso, corrección, eliminación o anonimización desde la página de solicitud de datos.</p>
        </div>
      </section>
    </main>
  );
}
