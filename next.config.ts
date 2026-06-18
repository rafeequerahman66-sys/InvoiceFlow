import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer must run as a Node external (it ships its own reconciler).
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
