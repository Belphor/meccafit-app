import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Next 16 bloqueia HMR/chunks de 127.0.0.1 vs localhost — quebra hidratação no Playwright e em alguns browsers.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
