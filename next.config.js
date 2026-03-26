// next.config.ts is the canonical config — this file is intentionally minimal
/** @type {import('next').NextConfig} */
const nextConfig = {
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
