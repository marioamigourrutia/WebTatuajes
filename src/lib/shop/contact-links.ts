import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";
import { formatClpPrice, type ShopProduct } from "./catalog";

type PurchaseWhatsAppInput = {
  studioPhone: string;
  requestCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  product: Pick<ShopProduct, "code" | "title" | "priceClp"> & { description?: string };
};

export function buildPurchaseWhatsAppMessage(input: Omit<PurchaseWhatsAppInput, "studioPhone">) {
  const emailLine = input.customerEmail ? `\nEmail: ${input.customerEmail}` : "";
  const detailsLine = input.product.description ? [`Detalles: ${input.product.description}`] : [];

  return [
    `Hola, quiero coordinar la solicitud ${input.requestCode} por una obra disponible.`,
    `Obra: ${input.product.title}`,
    `Código de obra: ${input.product.code}`,
    `Precio referencial: ${formatClpPrice(input.product.priceClp)}`,
    ...detailsLine,
    `Código de solicitud: ${input.requestCode}`,
    `Nombre: ${input.customerName}`,
    `Teléfono: ${input.customerPhone}${emailLine}`,
    "Quedo atento/a para coordinar disponibilidad, ubicación final, tamaño y próximos pasos con el estudio.",
    "Entiendo que este mensaje no confirma reserva ni pago; espero confirmación del estudio.",
  ].join("\n");
}

export function buildPurchaseWhatsAppUrl(input: PurchaseWhatsAppInput) {
  if (!hasWhatsAppConfig(input.studioPhone)) {
    return null;
  }

  return buildWhatsAppUrl({
    phone: input.studioPhone,
    message: buildPurchaseWhatsAppMessage(input),
  });
}
