import type { Metadata } from "next";
import { AppShell } from "@/lib/layout/app-shell";
import { buildRootMetadata } from "@/lib/seo/site-metadata";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = buildRootMetadata();

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
