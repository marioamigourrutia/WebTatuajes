export const purchaseRequestStatuses = [
  "pending",
  "contacted",
  "reserved",
  "sold",
  "discarded",
] as const;

export type PurchaseRequestStatus = (typeof purchaseRequestStatuses)[number];

export const purchaseRequestStatusLabels: Record<PurchaseRequestStatus, string> = {
  pending: "Pendiente",
  contacted: "Contactado",
  reserved: "Reservado",
  sold: "Vendido",
  discarded: "Descartado",
};

export function isPurchaseRequestStatus(value: unknown): value is PurchaseRequestStatus {
  return purchaseRequestStatuses.includes(value as PurchaseRequestStatus);
}
