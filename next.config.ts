import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify handles Next.js automatically, no special output needed
  // Transpile GSAP so webpack can handle its ES module syntax correctly
  transpilePackages: ["gsap"],
};

export default nextConfig;
