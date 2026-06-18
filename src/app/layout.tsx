import type { Metadata } from "next";
import { AppShell } from "@/lib/layout/app-shell";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "WebTatuajes — Estudio profesional de tatuajes",
  description:
    "Plataforma profesional para portafolio, cotizaciones privadas y agenda de tatuajes en Chile.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CL">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
