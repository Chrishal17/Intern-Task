/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  eslint: {
    // ✅ Only run linting locally, not during Vercel build
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig;