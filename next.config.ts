import type { NextConfig } from "next";

const corsOrigin = process.env.CORS_ORIGINS?.split(",")[0]?.trim() || process.env.NEXT_PUBLIC_APP_URL || "";

const nextConfig: NextConfig = {
  // Netlify handles Next.js automatically, no special output needed
  // Transpile GSAP so webpack can handle its ES module syntax correctly
  transpilePackages: ["gsap"],
  async headers() {
    if (!corsOrigin) return [];
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: corsOrigin },
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
