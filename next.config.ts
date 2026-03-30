import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    // No forced redirects for root — allow Home to render at '/'
    return [];
  },
};

export default nextConfig;
