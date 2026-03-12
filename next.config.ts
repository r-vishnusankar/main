import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify handles Next.js automatically, no special output needed
  // Transpile GSAP so webpack can handle its ES module syntax correctly
  transpilePackages: ["gsap"],
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
