import { NextResponse } from "next/server";
import { createQuoteRequest, createQuoteRequestFromFormData } from "@/lib/quotes/quote-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

    const result = await createQuoteRequestFromFormData(formData);

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

  const result = await createQuoteRequest(body);

  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: result.status });
  }

  return NextResponse.json({ id: result.id, quoteCode: result.quoteCode }, { status: 201 });
}
