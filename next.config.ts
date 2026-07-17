import path from "node:path";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
const scriptSrc =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org https://*.telegram.org"
    : "script-src 'self' 'unsafe-inline' https://telegram.org https://*.telegram.org";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project — without it, Next.js walks up
  // and can pick a stray lockfile in a parent directory (e.g. the user's
  // home folder) as the root, which breaks file tracing for the build.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      // Telegram user profile photos
      { protocol: "https", hostname: "t.me" },
      { protocol: "https", hostname: "*.telegram.org" },
      // Supabase Storage (bucket host is project-specific, set via env at runtime)
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://t.me https://*.telegram.org https://*.supabase.co",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://telegram.org https://*.telegram.org",
              "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
