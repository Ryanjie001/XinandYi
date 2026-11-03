import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  experimental: { cpus: 1 },
  // Keep production output separate from the development server on Windows.
  distDir: process.env.NODE_ENV === "production" ? ".next-production" : ".next",
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
