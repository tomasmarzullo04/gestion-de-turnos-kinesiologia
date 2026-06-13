import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // bcryptjs is pure JS, but we keep server-only packages external to the bundle.
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
