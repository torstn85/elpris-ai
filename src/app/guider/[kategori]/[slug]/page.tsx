// src/app/guider/[kategori]/[slug]/page.tsx
//
// Renderar enskilda MDX-artiklar med dynamic layer.
// Använder Next.js 14 App Router + MDX.

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import type { Metadata } from 'next';
import { mdxComponents } from '@/components/dynamic/mdxComponents';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';

const CONTENT_DIR = path.join(process.cwd(), 'src/content/guider');

interface PageProps {
  params: { kategori: string; slug: string };
}

interface Frontmatter {
  title: string;
  slug: string;
  category: string;
  description: string;
  metaTitle: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  keywords?: string[];
  readTime?: string;
}

function getArticle(kategori: string, slug: string) {
  const filePath = path.join(CONTENT_DIR, kategori, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const source = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(source);
  return { frontmatter: data as Frontmatter, content };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const article = getArticle(params.kategori, params.slug);
  if (!article) return {};

  const { frontmatter } = article;
  const url = `https://www.elpris.ai/guider/${params.kategori}/${params.slug}`;

  return {
    title: frontmatter.metaTitle || frontmatter.title,
    description: frontmatter.description,
    keywords: frontmatter.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: frontmatter.metaTitle || frontmatter.title,
      description: frontmatter.description,
      url,
      type: 'article',
      publishedTime: frontmatter.publishedAt,
      modifiedTime: frontmatter.updatedAt,
      authors: frontmatter.author ? [frontmatter.author] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: frontmatter.metaTitle || frontmatter.title,
      description: frontmatter.description,
    },
  };
}

export default function ArticlePage({ params }: PageProps) {
  const article = getArticle(params.kategori, params.slug);
  if (!article) notFound();

  const { frontmatter, content } = article;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: frontmatter.title,
    description: frontmatter.description,
    datePublished: frontmatter.publishedAt,
    dateModified: frontmatter.updatedAt || frontmatter.publishedAt,
    author: {
      '@type': 'Organization',
      name: frontmatter.author || 'elpris.ai',
    },
    publisher: {
      '@type': 'Organization',
      name: 'elpris.ai',
      url: 'https://www.elpris.ai',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.elpris.ai/guider/${params.kategori}/${params.slug}`,
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Hem', item: 'https://www.elpris.ai' },
      { '@type': 'ListItem', position: 2, name: 'Guider', item: 'https://www.elpris.ai/guider' },
      {
        '@type': 'ListItem',
        position: 3,
        name: params.kategori.charAt(0).toUpperCase() + params.kategori.slice(1),
        item: `https://www.elpris.ai/guider/${params.kategori}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: frontmatter.title,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="min-h-screen bg-[#0A2540] text-white">
        <NavBar />

        <article className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
          <nav className="text-xs text-slate-400 mb-6 flex items-center gap-2 flex-wrap">
            <a href="/" className="hover:text-cyan-400 transition">Hem</a>
            <span>/</span>
            <a href="/guider" className="hover:text-cyan-400 transition">Guider</a>
            <span>/</span>
            <a href={`/guider/${params.kategori}`} className="hover:text-cyan-400 transition capitalize">
              {params.kategori}
            </a>
          </nav>

          <div className="mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#00E5FF] flex items-center justify-center flex-shrink-0">
              <span className="text-[#0A2540] font-bold text-xs">ER</span>
            </div>
            <div>
              <p className="font-medium text-sm text-white">
                Av {frontmatter.author}
              </p>
              <p className="text-xs text-[#8fafc9]">
                <time dateTime={frontmatter.publishedAt}>
                  Publicerad{' '}
                  {new Date(frontmatter.publishedAt).toLocaleDateString('sv-SE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                {frontmatter.updatedAt &&
                  frontmatter.updatedAt !== frontmatter.publishedAt && (
                    <>
                      {' · '}
                      <time dateTime={frontmatter.updatedAt}>
                        Uppdaterad{' '}
                        {new Date(frontmatter.updatedAt).toLocaleDateString('sv-SE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </time>
                    </>
                  )}
                {frontmatter.readTime && <> · {frontmatter.readTime} läsning</>}
              </p>
            </div>
          </div>

          <div className="prose prose-invert prose-lg max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-h1:text-3xl sm:prose-h1:text-4xl prose-h1:mb-6
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-cyan-100
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-slate-300 prose-p:leading-relaxed
            prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white
            prose-table:text-sm
            prose-th:text-white prose-th:bg-[#0F3460] prose-th:font-semibold
            prose-td:border-slate-700
            prose-li:text-slate-300">
            <MDXRemote
              source={content}
              components={mdxComponents}
              options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
            />
          </div>

          {/* Om författaren */}
          <div className="bg-[#0F3460] border border-[#1E4976] rounded-2xl p-6 mt-12 mb-8 flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-[#00E5FF] flex items-center justify-center flex-shrink-0">
              <span className="text-[#0A2540] font-bold text-sm">ER</span>
            </div>
            <div>
              <p className="font-bold text-lg text-white mb-2">
                Av {frontmatter.author}
              </p>
              <p className="text-sm text-[#8fafc9] mb-3">
                elpris.ai är en oberoende redaktion som skriver om elpriser,
                energimarknaden och hur du som konsument kan dra nytta av
                kvartspris och smart elanvändning.
              </p>
              <a
                href="/om-oss"
                className="text-sm text-[#00E5FF] hover:underline"
              >
                → Läs mer om oss
              </a>
            </div>
          </div>

          <div className="pt-8 border-t border-[#1E4976]">
            <a
              href="/guider"
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition text-sm font-medium"
            >
              ← Tillbaka till alla guider
            </a>
          </div>
        </article>
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Footer />
        </div>
      </div>
    </>
  );
}
