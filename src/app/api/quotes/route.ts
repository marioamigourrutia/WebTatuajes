import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/bearer";
import { verifyCustomerIdToken } from "@/lib/auth/customer-token";
import { stripBotProtectionFields, validateBotProtection } from "@/lib/bot-protection";
import { createQuoteRequest, createQuoteRequestFromFormData } from "@/lib/quotes/quote-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const tokenVerification = await verifyCustomerIdToken(getBearerToken(request));

  if (!tokenVerification.ok) {
    return NextResponse.json(
      { errors: tokenVerification.errors },
      { status: tokenVerification.status },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { errors: { form: "El pedido no tiene archivos/formulario válido." } },
        { status: 400 },
      );
    }

    const botProtection = validateBotProtection(formData);
    if (!botProtection.ok) {
      return NextResponse.json({ errors: botProtection.errors }, { status: botProtection.status });
    }

    const result = await createQuoteRequestFromFormData(
      stripBotProtectionFields(formData),
      tokenVerification.customer,
    );

    if (!result.ok) {
      return NextResponse.json({ errors: result.errors }, { status: result.status });
    }

    return NextResponse.json({ id: result.id, quoteCode: result.quoteCode }, { status: 201 });
  }

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

  const result = await createQuoteRequest(
    stripBotProtectionFields(body),
    tokenVerification.customer,
  );

  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: result.status });
  }

  return NextResponse.json({ id: result.id, quoteCode: result.quoteCode }, { status: 201 });
}
