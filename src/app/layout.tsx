import type { Metadata } from "next";
import { Anton, IBM_Plex_Sans } from "next/font/google";
import { AppShell } from "@/lib/layout/app-shell";
import { buildRootMetadata } from "@/lib/seo/site-metadata";
import { Providers } from "./providers";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const displayFont = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CL" className={`${bodyFont.variable} ${displayFont.variable}`}>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
