import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "/", changeFrequency: "weekly", priority: 1 },
    { url: "/packages", changeFrequency: "daily", priority: 0.8 },
  ];
}
