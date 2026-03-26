import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/pricing',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
