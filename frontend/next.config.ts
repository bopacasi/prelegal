import type { NextConfig } from "next";
import { BACKEND_URL } from "./lib/config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle (.next/standalone) for the Docker image.
  output: "standalone",
  // The browser calls /api/* on the frontend's own origin, so no CORS is needed.
  // Rewrites are fixed at build time, so the Docker build passes BACKEND_URL.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
