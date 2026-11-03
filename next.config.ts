import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["playwright-core"],
  outputFileTracingIncludes: { "/api/studio/generate": ["./studio-template/**/*"] },
};

export default nextConfig;
