// next.config.ts is the canonical config — this file is intentionally minimal
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    // Redirects intentionally removed so root no longer forces /pricing.
    // Keep this hook in place for future redirects if needed.
    return [];
  },
};

export default nextConfig;
