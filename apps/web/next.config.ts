import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@red/shared"],
  poweredByHeader: false,
};

export default nextConfig;
