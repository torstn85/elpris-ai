// src/app/guider/[kategori]/page.tsx
//
// Listar alla artiklar i en specifik kategori.

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

const CONTENT_DIR = path.join(process.cwd(), 'src/content/guider');

const CATEGORY_LABELS: Record<string, string> = {
  elavtal: 'Elavtal',
  'forsta-elpriset': 'Förstå elpriset',
  'spara-el': 'Spara el',
  elomraden: 'Elområden',
  'teknik-och-trender': 'Teknik & trender',
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  elavtal: 'Allt om elavtal — välj rätt avtal, byt smidigt och förstå skillnaden mellan rörligt, fast och kvartspris.',
  'forsta-elpriset': 'Förstå hur elpriset sätts: spotpris, Nord Pool-auktionen, elområden och alla beståndsdelar i din räkning.',
  'spara-el': 'Konkreta sätt att sänka din elräkning — från smart laddning till bästa tvättfönster.',
  elomraden: 'Sveriges fyra elområden förklarade: varför priserna skiljer sig och vad det betyder för dig.',
  'teknik-och-trender': 'Smarta hem, hemmabatterier, AI och annat som förändrar hur vi använder och betalar för el.',
};

interface PageProps {
  params: { kategori: string };
}

interface ArticleMeta {
  title: string;
  slug: string;
  description: string;
  publishedAt: string;
  readTime?: string;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const label = CATEGORY_LABELS[params.kategori];
  if (!label) return {};

  return {
    title: `${label} – guider | elpris.ai`,
    description: CATEGORY_DESCRIPTIONS[params.kategori],
    alternates: { canonical: `https://www.elpris.ai/guider/${params.kategori}` },
  };
}

function getCategoryArticles(kategori: string): ArticleMeta[] {
  const catPath = path.join(CONTENT_DIR, kategori);
  if (!fs.existsSync(catPath)) return [];

  const articles: ArticleMeta[] = [];
  for (const file of fs.readdirSync(catPath)) {
    if (!file.endsWith('.mdx')) continue;
    const source = fs.readFileSync(path.join(catPath, file), 'utf8');
    const { data } = matter(source);
    articles.push({
      title: data.title,
      slug: data.slug,
      description: data.description,
      publishedAt: data.publishedAt,
      readTime: data.readTime,
    });
  }

  return articles.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export default function CategoryPage({ params }: PageProps) {
  const label = CATEGORY_LABELS[params.kategori];
  if (!label) notFound();

  const articles = getCategoryArticles(params.kategori);

  return (
    <div className="min-h-screen bg-[#0A2540] text-white">
      <NavBar />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
        <nav className="text-xs text-slate-400 mb-6 flex items-center gap-2">
          <a href="/" className="hover:text-cyan-400 transition">Hem</a>
          <span>/</span>
          <a href="/guider" className="hover:text-cyan-400 transition">Guider</a>
          <span>/</span>
          <span>{label}</span>
        </nav>

        <header className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {label}
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            {CATEGORY_DESCRIPTIONS[params.kategori]}
          </p>
        </header>

        {articles.length === 0 ? (
          <p className="text-slate-400">Inga guider i denna kategori än. Kom snart tillbaka!</p>
        ) : (
          <div className="grid gap-4">
            {articles.map((article) => (
              <a
                key={article.slug}
                href={`/guider/${params.kategori}/${article.slug}`}
                className="block rounded-xl bg-[#0F3460] hover:bg-[#0F3460]/80 ring-1 ring-[#1E4976] hover:ring-[#00E5FF]/40 transition p-6"
              >
                <h2 className="text-xl font-bold text-white mb-2">
                  {article.title}
                </h2>
                <p className="text-slate-400 text-sm mb-3">{article.description}</p>
                {article.readTime && (
                  <span className="text-xs text-slate-500">
                    {article.readTime} läsning
                  </span>
                )}
              </a>
            ))}
          </div>
        )}
        <Footer className="mt-12" />
      </div>
    </div>
  );
}
