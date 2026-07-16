import path from "node:path";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
};

export default withNextIntl(nextConfig);
