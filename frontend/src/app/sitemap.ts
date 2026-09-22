import type { MetadataRoute } from "next";

const BASE = "https://wufud.musfiqdehan.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1, lastModified: new Date() },
    { url: `${BASE}/packages`, changeFrequency: "daily", priority: 0.8, lastModified: new Date() },
    { url: `${BASE}/start`, changeFrequency: "weekly", priority: 0.7, lastModified: new Date() },
    { url: `${BASE}/register`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/login`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
