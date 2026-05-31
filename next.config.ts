import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mapbox-gl ships CJS that Turbopack can't eval in the browser
  // ("module is not defined"); run it through Next's transformer.
  transpilePackages: ["mapbox-gl"],
};

export default nextConfig;
