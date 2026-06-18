import { QuoteRequestForm } from "@/lib/quotes/quote-request-form";

export default function QuotePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-6 py-10">
      <QuoteRequestForm />
    </main>
  );
}
