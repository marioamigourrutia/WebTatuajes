import { buildWhatsAppUrl, hasWhatsAppConfig } from "@/lib/whatsapp";
import type { ShopProduct } from "./catalog";

type PurchaseWhatsAppInput = {
  studioPhone: string;
  requestCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  product: Pick<ShopProduct, "code" | "title" | "priceClp">;
};

export function buildPurchaseWhatsAppMessage(input: Omit<PurchaseWhatsAppInput, "studioPhone">) {
  const emailLine = input.customerEmail ? `\nEmail: ${input.customerEmail}` : "";

  return [
    `Hola, quiero consultar por la obra ${input.product.title} (${input.product.code}).`,
    `Código de solicitud: ${input.requestCode}`,
    `Nombre: ${input.customerName}`,
    `Teléfono: ${input.customerPhone}${emailLine}`,
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
