import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure the correct project root to avoid stale caches when multiple lockfiles exist
    root: __dirname,
  },
  // Opt-in to stricter dev origin to silence warning (adjust as needed)
  experimental: {
    // Nothing else for now
  },
};

export default nextConfig;
