import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // maplibre-gl is pure ESM; transpile kept for consistency/safety.
  transpilePackages: ["maplibre-gl"],
};

export default nextConfig;
