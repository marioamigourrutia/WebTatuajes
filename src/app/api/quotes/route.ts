import { NextResponse } from "next/server";
import { stripBotProtectionFields, validateBotProtection } from "@/lib/bot-protection";
import { getFirebaseAdminFirestore } from "@/lib/firebase/admin";
import { checkRateLimit, getRateLimitOptions, getRequestRateLimitKey } from "@/lib/rate-limit";
import { createQuoteRequest, createQuoteRequestFromFormData } from "@/lib/quotes/quote-request";

export const runtime = "nodejs";

const publicHandoffChannels = new Set(["whatsapp", "email", "instagram"]);

function readHandoffChannel(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const channel = value.trim().toLowerCase();
  return publicHandoffChannels.has(channel) ? channel : null;
}

async function persistHandoffChannel(quoteId: string, channel: string | null) {
  if (!channel) return;

  const firestore = getFirebaseAdminFirestore();
  if (!firestore) return;

  await firestore.collection("quotes").doc(quoteId).set(
    {
      preferred_contact_method: channel,
      handoff_channel: channel,
    },
    { merge: true },
  );
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    getRequestRateLimitKey(request, "quotes"),
    getRateLimitOptions("quotes"),
  );
  if (!rateLimit.ok) {
    return NextResponse.json({ errors: { form: rateLimit.message } }, { status: 429 });
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

    const handoffChannel = readHandoffChannel(formData.get("handoffChannel"));
    const result = await createQuoteRequestFromFormData(stripBotProtectionFields(formData));

    if (!result.ok) {
      return NextResponse.json({ errors: result.errors }, { status: result.status });
    }

    await persistHandoffChannel(result.id, handoffChannel);
    return NextResponse.json(result, { status: 201 });
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

  const result = await createQuoteRequest(stripBotProtectionFields(body));

  if (!result.ok) {
    return NextResponse.json({ errors: result.errors }, { status: result.status });
  }

  return NextResponse.json(result, { status: 201 });
}
