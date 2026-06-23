import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";

import { buildArchive, readArticles } from "./articles.server";

const directories: string[] = [];

async function createContentDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "reading-site-"));
  directories.push(directory);
  return directory;
}

async function writeArticle(
  directory: string,
  filename: string,
  frontmatter: string,
  markdown = "## 小节\n\n正文"
) {
  const filepath = join(directory, filename);
  await mkdir(join(filepath, ".."), { recursive: true });
  await writeFile(filepath, `---\n${frontmatter}\n---\n\n${markdown}`, "utf8");
}

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("readArticles", () => {
  it("loads every checked-in article", async () => {
    const articles = await readArticles(join(process.cwd(), "content/articles"));

    expect(articles.length).toBeGreaterThan(0);
  });

  it("sorts published Markdown articles newest first and omits drafts", async () => {
    const directory = await createContentDirectory();
    await writeArticle(directory, "first.md", "title: 第一篇\ndate: 2026-02-12\nsummary: 第一篇摘要");
    await writeArticle(directory, "latest.md", "title: 最近一篇\ndate: 2026-05-25\nsummary: 最近摘要");
    await writeArticle(
      directory,
      "hidden.md",
      "title: 草稿\ndate: 2026-06-01\nsummary: 暂不发布\ndraft: true"
    );

    const articles = await readArticles(directory);

    expect(articles.map((article) => article.slug)).toEqual(["latest", "first"]);
  });

  it("renders code and creates unique stable outline anchors for repeated Chinese headings", async () => {
    const directory = await createContentDirectory();
    await writeArticle(
      directory,
      "outline.md",
      "title: 标题\ndate: 2026-05-25\nsummary: 摘要",
      "## 阅读\n\n### 阅读\n\n```ts\nconst site = true;\n```"
    );

    const [article] = await readArticles(directory);

    expect(article.outline).toEqual([
      { depth: 2, id: "阅读", text: "阅读" },
      { depth: 3, id: "阅读-1", text: "阅读" }
    ]);
    expect(article.html).toContain('id="阅读"');
    expect(article.html).toContain("hljs");
  });

  it("rejects missing required metadata and invalid dates with the file path", async () => {
    const directory = await createContentDirectory();
    await writeArticle(directory, "broken.md", "title: 坏文章\ndate: 2026-02-31");

    await expect(readArticles(directory)).rejects.toThrow(/broken\.md.*summary|summary.*broken\.md/);
  });

  it("rejects duplicate slugs across nested source folders", async () => {
    const directory = await createContentDirectory();
    await writeArticle(directory, "journal/same.md", "title: 一\ndate: 2026-01-01\nsummary: 一");
    await writeArticle(directory, "notes/same.md", "title: 二\ndate: 2026-02-01\nsummary: 二");

    await expect(readArticles(directory)).rejects.toThrow(/Duplicate article slug "same"/);
  });
});

describe("buildArchive", () => {
  it("groups articles by year then month while preserving article sort order", async () => {
    const directory = await createContentDirectory();
    await writeArticle(directory, "may-new.md", "title: 五月新文\ndate: 2026-05-25\nsummary: 摘要");
    await writeArticle(directory, "may-old.md", "title: 五月旧文\ndate: 2026-05-01\nsummary: 摘要");
    await writeArticle(directory, "dec.md", "title: 十二月\ndate: 2025-12-02\nsummary: 摘要");

    const archive = buildArchive(await readArticles(directory));

    expect(archive).toEqual([
      {
        year: "2026",
        months: [{ month: "05", articles: expect.arrayContaining([
          expect.objectContaining({ slug: "may-new" }),
          expect.objectContaining({ slug: "may-old" })
        ]) }]
      },
      {
        year: "2025",
        months: [{ month: "12", articles: [expect.objectContaining({ slug: "dec" })] }]
      }
    ]);
    expect(archive[0].months[0].articles.map((article) => article.slug)).toEqual(["may-new", "may-old"]);
  });
});
