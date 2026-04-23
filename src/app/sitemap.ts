import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { MetadataRoute } from "next";

const BASE_URL = "https://elpris.ai";
const CONTENT_DIR = path.join(process.cwd(), "src/content/guider");

function getGuideEntries(): MetadataRoute.Sitemap {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const entries: MetadataRoute.Sitemap = [];

  for (const kategori of fs.readdirSync(CONTENT_DIR)) {
    const catPath = path.join(CONTENT_DIR, kategori);
    if (!fs.statSync(catPath).isDirectory()) continue;

    entries.push({
      url: `${BASE_URL}/guider/${kategori}`,
      changeFrequency: "weekly",
      priority: 0.7,
    });

    for (const file of fs.readdirSync(catPath)) {
      if (!file.endsWith(".mdx")) continue;
      const source = fs.readFileSync(path.join(catPath, file), "utf8");
      const { data } = matter(source);
      const lastmod = data.updatedAt || data.publishedAt;
      entries.push({
        url: `${BASE_URL}/guider/${kategori}/${data.slug}`,
        lastModified: lastmod ? new Date(lastmod) : undefined,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/elpris-idag`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/elpris-imorgon`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/elomrade`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/elomrade/se1`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/elomrade/se2`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/elomrade/se3`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/elomrade/se4`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/integritetspolicy`,
      lastModified: new Date("2026-04-14"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/guider`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...getGuideEntries(),
  ];
}
