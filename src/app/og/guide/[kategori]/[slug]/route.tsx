// OG-bild med guidens titel. Byggs statiskt för alla guider.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CATEGORY_LABELS } from "@/lib/guideCategories";
import { renderGuideOg } from "@/lib/og/images";

export const dynamicParams = false;

const CONTENT_DIR = path.join(process.cwd(), "src/content/guider");

export function generateStaticParams() {
  return fs
    .readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      fs
        .readdirSync(path.join(CONTENT_DIR, d.name))
        .filter((f) => f.endsWith(".mdx"))
        .map((f) => ({ kategori: d.name, slug: f.replace(/\.mdx$/, "") })),
    );
}

export function GET(_req: Request, { params }: { params: { kategori: string; slug: string } }) {
  const file = path.join(CONTENT_DIR, params.kategori, `${params.slug}.mdx`);
  const { data } = matter(fs.readFileSync(file, "utf8"));
  return renderGuideOg(String(data.title), CATEGORY_LABELS[params.kategori] ?? "Guide");
}
