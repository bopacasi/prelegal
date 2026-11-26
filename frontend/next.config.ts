import type { NextConfig } from "next";

// Rewrites are fixed at build time, so the Docker build passes BACKEND_URL.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle (.next/standalone) for the Docker image.
  output: "standalone",
  // The browser calls /api/* on the frontend's own origin, so no CORS is needed.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
