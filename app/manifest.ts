import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Volley72 — Волейбол в Тюмени",
    short_name: "Volley72",
    description: "Игры, тренировки и турниры по волейболу в Тюмени",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1535",
    theme_color: "#0b1535",
    lang: "ru",
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
    ],
  };
}
