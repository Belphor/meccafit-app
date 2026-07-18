import type { MetadataRoute } from "next";

/**
 * Manifest do PWA FENYXIA Meccafit.
 * `display: standalone` → app abre sem barras do navegador (cara de nativo).
 * Paleta IRIS: fundo e tema pretos.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FENYXIA Meccafit",
    short_name: "Meccafit",
    description: "Portal de Brasa — ecossistema FENYXIA Meccafit.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#000000",
    theme_color: "#000000",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
