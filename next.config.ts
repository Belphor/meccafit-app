import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Esconde o badge "N" do Next.js no canto — atrapalha QA/apresentação no mobile.
  // Erros de runtime/build continuam a ser reportados pelo overlay.
  devIndicators: false,
  // Next 16 bloqueia HMR/chunks de 127.0.0.1 vs localhost — quebra hidratação no Playwright e em alguns browsers.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Edge TTS usa WebSocket Node-side; evita bundling quebrado no standalone.
  serverExternalPackages: ["edge-tts-universal"],
  // Qualidade de imagem no responsivo: formatos modernos + níveis de qualidade
  // altos + breakpoints granulares para servir variantes mais nítidas em telas
  // pequenas e de alta densidade (retina), sem alterar layout ou comportamento.
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90, 100],
    deviceSizes: [320, 420, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 176, 224, 256, 384],
  },
};

export default nextConfig;
