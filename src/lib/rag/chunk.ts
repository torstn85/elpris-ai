// Chunk-logik för RAG. Tar en MDX-artikel och delar den i chunks anpassade
// för embedding (Voyage AI, vector(1024)). Strategi:
//   - Intro-chunk: title + description + första 2-3 styckena (före första H2)
//   - Per H2-sektion därefter
//   - H2-sektioner > ~800 tokens delas vid paragraph-gräns
//   - MDX-komponenter (single-line + multi-line) skippas
//   - H2-chunks < 80 tokens skippas (men intro-chunk skippas aldrig)

import matter from 'gray-matter';

export type Chunk = {
  chunk_text: string;
  heading_path: string;
  chunk_index: number;
  article_slug: string;
  category: string;
};

const MAX_CHARS_PER_CHUNK = 3200; // ~800 tokens (4 chars/token)
const MIN_CHUNK_TOKENS = 80;
const INTRO_PARAGRAPH_LIMIT = 3;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Strippar React-komponenter (rader/block som börjar med <CapitalLetter).
 * Hanterar både enkelradiga (<Foo />) och multi-line (<Foo\n  prop="x"\n/>).
 *
 * Exit-villkor från multi-line-state:
 *   1. Rad som slutar med `/>`  (self-closing)
 *   2. Rad som slutar med `</Komponent>`  (paired)
 *   3. Tom rad  (säkerhetsnät — komponenter ska inte spänna paragraf-brott)
 *
 * Lowercase HTML-taggar (<details>, <summary>, <a>) är legitim text och rörs inte.
 */
function stripMDXComponents(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let inMultiLine = false;

  for (const line of lines) {
    if (inMultiLine) {
      // Exit conditions
      if (/\/>\s*$/.test(line) || /<\/[A-Z]\w*>\s*$/.test(line)) {
        inMultiLine = false;
        continue; // skip closing line
      }
      if (line.trim() === '') {
        // Säkerhetsnät — bryt ut, behåll blank rad så paragraph-split fungerar
        inMultiLine = false;
        out.push(line);
        continue;
      }
      continue; // still in component, drop line
    }

    // Not in multi-line — check if this line starts one
    if (/^\s*<[A-Z]/.test(line)) {
      // Started a component
      if (/\/>\s*$/.test(line) || /<\/[A-Z]\w*>\s*$/.test(line)) {
        // Single-line component
        continue;
      }
      // Multi-line component — enter state
      inMultiLine = true;
      continue;
    }

    out.push(line);
  }

  return out.join('\n');
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

interface RawSection {
  heading: string | null;
  contentLines: string[];
}

function splitIntoSections(body: string): RawSection[] {
  const lines = body.split('\n');
  const sections: RawSection[] = [{ heading: null, contentLines: [] }];
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      sections.push({ heading: m[1].trim(), contentLines: [] });
    } else {
      sections[sections.length - 1].contentLines.push(line);
    }
  }
  return sections;
}

function splitLongChunk(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const paras = paragraphs(text);
  const chunks: string[] = [];
  let current = '';

  for (const para of paras) {
    const candidate = current ? `${current}\n\n${para}` : para;
    if (candidate.length > maxChars && current.length > 0) {
      chunks.push(current);
      current = para;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function chunkArticle(
  mdxContent: string,
  articleSlug: string,
  category: string,
): Chunk[] {
  const { data: frontmatter, content: body } = matter(mdxContent);
  const title = (frontmatter.title as string | undefined) ?? articleSlug;
  const description = (frontmatter.description as string | undefined) ?? '';

  const cleanBody = stripMDXComponents(body);
  const sections = splitIntoSections(cleanBody);

  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  // 1. Intro chunk: title + description + first N paragraphs (before first H2).
  //    Skippas ALDRIG (säkerhetsnät för korta artiklar).
  const intro = sections.find((s) => s.heading === null);
  const introParas = intro
    ? paragraphs(intro.contentLines.join('\n')).slice(0, INTRO_PARAGRAPH_LIMIT)
    : [];

  const introTextParts = [title];
  if (description) introTextParts.push(description);
  introTextParts.push(...introParas);
  const introText = introTextParts.join('\n\n').trim();

  chunks.push({
    chunk_text: introText,
    heading_path: title,
    chunk_index: chunkIndex++,
    article_slug: articleSlug,
    category,
  });

  // 2. Per-H2-section chunks
  for (const section of sections) {
    if (section.heading === null) continue;

    const sectionContent = section.contentLines.join('\n').trim();
    if (!sectionContent) continue;

    const headingPath = `${title} > ${section.heading}`;
    const fullText = `## ${section.heading}\n\n${sectionContent}`;
    const subChunks = splitLongChunk(fullText, MAX_CHARS_PER_CHUNK);

    for (const subChunk of subChunks) {
      const tokens = estimateTokens(subChunk);
      if (tokens < MIN_CHUNK_TOKENS) {
        console.log(
          `Skipped thin chunk: ${headingPath} (${tokens} tokens)`,
        );
        continue;
      }
      chunks.push({
        chunk_text: subChunk,
        heading_path: headingPath,
        chunk_index: chunkIndex++,
        article_slug: articleSlug,
        category,
      });
    }
  }

  return chunks;
}
