import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { appConfig } from "@/lib/config/app";

export const metadata: Metadata = {
  title: "Instagram",
  description: "Trabajos y referencias visuales publicados en Instagram.",
  robots: { index: false, follow: true },
};

export default function PortfolioRedirectPage() {
  redirect(appConfig.instagramUrl || "/");
}
