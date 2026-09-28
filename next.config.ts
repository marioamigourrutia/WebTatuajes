import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";
const instagramUrl =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "https://www.instagram.com/marioamigotattoo/";

function readSpaceSeparatedEnv(name: string) {
  return (process.env[name] ?? "")
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

const extraConnectSrc = readSpaceSeparatedEnv("CSP_CONNECT_SRC_EXTRA");
const extraImgSrc = readSpaceSeparatedEnv("CSP_IMG_SRC_EXTRA");
const extraFrameSrc = readSpaceSeparatedEnv("CSP_FRAME_SRC_EXTRA");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  ["img-src 'self' data: blob: https:", ...extraImgSrc].join(" "),
  "font-src 'self' data:",
  [
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com wss://*.firebaseio.com",
    ...extraConnectSrc,
  ].join(" "),
  ["frame-src 'self' https://*.firebaseapp.com", ...extraFrameSrc].join(" "),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://wa.me https://api.whatsapp.com https://www.instagram.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
    : []),
];

const noIndexHeaders = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];
const legacyNoIndexRoutes = ["/servicios", "/tienda", "/manejo-imagenes"];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/portfolio",
        destination: instagramUrl,
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/admin/:path*",
        headers: noIndexHeaders,
      },
      ...legacyNoIndexRoutes.map((source) => ({
        source,
        headers: noIndexHeaders,
      })),
    ];
  },
};

export default nextConfig;
