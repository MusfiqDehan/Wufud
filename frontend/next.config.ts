import type { NextConfig } from "next";

const backend = process.env.API_INTERNAL_URL ?? "http://localhost:4005";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      // Canonical versioned API, e.g. `/api/v1/auth/login` -> backend `/api/v1/auth/login`.
      {
        source: "/api/v1/:path*",
        destination: `${backend}/api/v1/:path*`,
      },
      // Legacy unversioned `/api/...` (backend rewrites these to `/api/v1/...`).
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
