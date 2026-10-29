import type { MetadataRoute } from "next";

// App icons keep the sage tile in both themes; they don't flip with the toggle.
const manifest = (): MetadataRoute.Manifest => ({
  name: "ChaosCaiet",
  short_name: "ChaosCaiet",
  description: "A private journal.",
  start_url: "/",
  display: "standalone",
  // muted-indigo, the dark theme's ground (the default)
  background_color: "#665c99",
  theme_color: "#665c99",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
});

export default manifest;
