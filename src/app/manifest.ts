import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nous ✦",
    short_name: "Nous",
    description: "Notre journal de couple",
    lang: "fr-BE",
    dir: "ltr",
    start_url: "/home?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone"],
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Activité", short_name: "Activité", url: "/activity", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Carte", short_name: "Carte", url: "/map", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Qui paie le resto ?", short_name: "Resto", url: "/resto", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
