import { NextResponse } from "next/server";
import { stripBotProtectionFields, validateBotProtection } from "@/lib/bot-protection";
import { createPurchaseRequest } from "@/lib/shop/purchase-request";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { errors: { form: "El pedido no tiene JSON válido." } },
      { status: 400 },
    );
  }

  const botProtection = validateBotProtection(body);
  if (!botProtection.ok) {
    return NextResponse.json({ errors: botProtection.errors }, { status: botProtection.status });
  }

  const result = await createPurchaseRequest(stripBotProtectionFields(body));

  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: result.status });
  }

  return NextResponse.json(
    { id: result.id, purchaseCode: result.purchaseCode, whatsappUrl: result.whatsappUrl },
    { status: 201 },
  );
}
