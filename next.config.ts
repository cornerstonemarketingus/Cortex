import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf.js is a large CJS/ESM hybrid; keep it out of the server bundle.
  serverExternalPackages: ['pdfjs-dist'],
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
