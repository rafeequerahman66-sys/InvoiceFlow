import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer must run as a Node external (it ships its own reconciler).
  serverExternalPackages: ["@react-pdf/renderer"],

  // The PDF route reads bundled .ttf fonts (for the ₹ glyph) from disk at runtime.
  // Next won't trace files loaded via a dynamic fs path, so include them explicitly.
  outputFileTracingIncludes: {
    "/api/pdf": ["./src/lib/pdf/fonts/**"],
  },

  headers: async () => [
    {
      // Service worker must not be cached by the browser — always fetch fresh
      // so updates propagate immediately.
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
    {
      // PWA manifest — short cache so icon/name changes propagate quickly.
      source: "/manifest.json",
      headers: [{ key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" }],
    },
    {
      // SVG icons — cache for a week.
      source: "/:icon(icon-192|icon-512).svg",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" }],
    },
  ],
};

export default nextConfig;
