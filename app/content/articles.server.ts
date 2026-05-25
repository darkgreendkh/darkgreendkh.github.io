import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import GithubSlugger from "github-slugger";
import matter from "gray-matter";
import type { Heading, Root } from "mdast";
import { toString } from "mdast-util-to-string";
import rehypeHighlight from "rehype-highlight";
import rehypeStringify from "rehype-stringify";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export type ArticleFrontmatter = {
  title: string;
  date: string;
  summary: string;
  draft?: boolean;
};

export type OutlineEntry = {
  depth: 2 | 3;
  id: string;
  text: string;
};

export type Article = ArticleFrontmatter & {
  slug: string;
  html: string;
  outline: OutlineEntry[];
};

export type ArchiveYear = {
  year: string;
  months: Array<{
    month: string;
    articles: Article[];
  }>;
};

async function findMarkdownFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return findMarkdownFiles(path);
      }
      return extname(entry.name) === ".md" ? [path] : [];
    })
  );
  return paths.flat();
}

function normalizeDate(rawValue: unknown, filepath: string): string {
  const date =
    rawValue instanceof Date ? rawValue.toISOString().slice(0, 10) : String(rawValue ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date in ${filepath}: expected YYYY-MM-DD`);
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`Invalid date in ${filepath}: ${date}`);
  }
  return date;
}

function parseMetadata(data: Record<string, unknown>, filepath: string): ArticleFrontmatter {
  const title = data.title;
  const summary = data.summary;
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new Error(`Missing title in ${filepath}`);
  }
  if (typeof summary !== "string" || summary.trim().length === 0) {
    throw new Error(`Missing summary in ${filepath}`);
  }
  if (data.draft !== undefined && typeof data.draft !== "boolean") {
    throw new Error(`Invalid draft flag in ${filepath}: expected boolean`);
  }
  return {
    title: title.trim(),
    date: normalizeDate(data.date, filepath),
    summary: summary.trim(),
    draft: data.draft
  };
}

async function renderMarkdown(markdown: string): Promise<{ html: string; outline: OutlineEntry[] }> {
  const outline: OutlineEntry[] = [];
  const slugger = new GithubSlugger();
  const result = await unified()
    .use(remarkParse)
    .use(() => (tree) => {
      visit(tree as Root, "heading", (heading: Heading) => {
        if (heading.depth !== 2 && heading.depth !== 3) {
          return;
        }
        const text = toString(heading).trim();
        const id = slugger.slug(text);
        heading.data = {
          ...heading.data,
          hProperties: { ...heading.data?.hProperties, id }
        };
        outline.push({ depth: heading.depth, id, text });
      });
    })
    .use(remarkRehype)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(markdown);

  return { html: String(result), outline };
}

async function readArticle(filepath: string): Promise<Article> {
  const source = await readFile(filepath, "utf8");
  const document = matter(source);
  const metadata = parseMetadata(document.data as Record<string, unknown>, filepath);
  const { html, outline } = await renderMarkdown(document.content);
  return {
    ...metadata,
    slug: basename(filepath, ".md"),
    html,
    outline
  };
}

export async function readArticles(directory: string): Promise<Article[]> {
  const files = await findMarkdownFiles(directory);
  const articles = await Promise.all(files.map((filepath) => readArticle(filepath)));
  const seen = new Set<string>();
  for (const article of articles) {
    if (seen.has(article.slug)) {
      throw new Error(`Duplicate article slug "${article.slug}"`);
    }
    seen.add(article.slug);
  }
  return articles
    .filter((article) => !article.draft)
    .sort((left, right) => right.date.localeCompare(left.date));
}

export function buildArchive(articles: Article[]): ArchiveYear[] {
  const archive: ArchiveYear[] = [];
  for (const article of articles) {
    const year = article.date.slice(0, 4);
    const month = article.date.slice(5, 7);
    let yearGroup = archive.find((group) => group.year === year);
    if (!yearGroup) {
      yearGroup = { year, months: [] };
      archive.push(yearGroup);
    }
    let monthGroup = yearGroup.months.find((group) => group.month === month);
    if (!monthGroup) {
      monthGroup = { month, articles: [] };
      yearGroup.months.push(monthGroup);
    }
    monthGroup.articles.push(article);
  }
  return archive;
}
