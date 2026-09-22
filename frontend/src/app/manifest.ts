import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wufud | Hajj & Umrah Booking Platform",
    short_name: "Wufud",
    description:
      "From the first booking to the journey home. Bring your packages, pilgrims, teams, and payments together in one calm, connected workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#102D29",
    icons: [
      { src: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { src: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/logo-mark.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
