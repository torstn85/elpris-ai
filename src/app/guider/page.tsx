// src/app/guider/page.tsx
//
// Översiktssida för alla guider.

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';

const CONTENT_DIR = path.join(process.cwd(), 'src/content/guider');

export const metadata: Metadata = {
  title: 'Guider om elpriser och elavtal | elpris.ai',
  description: 'Allt du behöver veta om elpriser, elavtal och hur du sparar el. Konkreta guider med live-data från elmarknaden.',
  alternates: { canonical: 'https://www.elpris.ai/guider' },
};

interface ArticleMeta {
  title: string;
  slug: string;
  category: string;
  description: string;
  publishedAt: string;
  readTime?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  elavtal: 'Elavtal',
  'forsta-elpriset': 'Förstå elpriset',
  'spara-el': 'Spara el',
  elomraden: 'Elområden',
  'teknik-och-trender': 'Teknik & trender',
};

function getAllArticles(): ArticleMeta[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const articles: ArticleMeta[] = [];

  for (const kategori of fs.readdirSync(CONTENT_DIR)) {
    const catPath = path.join(CONTENT_DIR, kategori);
    if (!fs.statSync(catPath).isDirectory()) continue;

    for (const file of fs.readdirSync(catPath)) {
      if (!file.endsWith('.mdx')) continue;
      const source = fs.readFileSync(path.join(catPath, file), 'utf8');
      const { data } = matter(source);
      articles.push({
        title: data.title,
        slug: data.slug,
        category: kategori,
        description: data.description,
        publishedAt: data.publishedAt,
        readTime: data.readTime,
      });
    }
  }

  return articles.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export default function GuiderPage() {
  const articles = getAllArticles();

  const byCategory: Record<string, ArticleMeta[]> = {};
  for (const article of articles) {
    if (!byCategory[article.category]) byCategory[article.category] = [];
    byCategory[article.category].push(article);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NavBar />

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Guider om elpriser
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Konkreta guider för att förstå elpriser, välja rätt elavtal och spara på elen.
            Alla guider använder live-data från elmarknaden.
          </p>
        </header>

        {articles.length === 0 ? (
          <p className="text-slate-400">Guider publiceras snart.</p>
        ) : (
          <div className="space-y-12">
            {Object.entries(byCategory).map(([category, items]) => (
              <section key={category}>
                <h2 className="text-2xl font-bold text-cyan-400 mb-6">
                  {CATEGORY_LABELS[category] || category}
                </h2>
                <div className="grid gap-4">
                  {items.map((article) => (
                    <a
                      key={article.slug}
                      href={`/guider/${article.category}/${article.slug}`}
                      className="block rounded-xl bg-slate-900 hover:bg-slate-800 ring-1 ring-slate-800 hover:ring-cyan-500 transition p-6"
                    >
                      <h3 className="text-xl font-bold text-white mb-2">
                        {article.title}
                      </h3>
                      <p className="text-slate-400 text-sm mb-3">{article.description}</p>
                      {article.readTime && (
                        <span className="text-xs text-slate-500">
                          {article.readTime} läsning
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
