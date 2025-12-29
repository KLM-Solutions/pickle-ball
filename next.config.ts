import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure the correct project root to avoid stale caches when multiple lockfiles exist
    root: __dirname,
  },
  experimental: {
    // Include puppeteer packages in server components for PDF generation
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min'],
  },
};

export default nextConfig;
