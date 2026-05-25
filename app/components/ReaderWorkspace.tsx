import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";

import type { Article, ArchiveYear, OutlineEntry } from "../content/articles.server";
import type { SiteConfig } from "../site-config";

type ReaderWorkspaceProps = {
  site: SiteConfig;
  article: Article;
  archive: ArchiveYear[];
};

type DrawerName = "archive" | "outline" | null;

function ArchiveNavigation({ archive, currentSlug }: { archive: ArchiveYear[]; currentSlug: string }) {
  return (
    <nav className="archive-navigation" aria-label="文章归档">
      {archive.map((year) => (
        <section className="archive-year" key={year.year}>
          <p>{year.year}</p>
          {year.months.map((month) => (
            <div className="archive-month" key={`${year.year}-${month.month}`}>
              <span>{month.month}</span>
              <ul>
                {month.articles.map((entry) => (
                  <li key={entry.slug}>
                    <Link
                      className={entry.slug === currentSlug ? "is-current" : undefined}
                      aria-current={entry.slug === currentSlug ? "page" : undefined}
                      to={`/articles/${entry.slug}/`}
                    >
                      {entry.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </nav>
  );
}

function OutlineNavigation({
  outline,
  activeId
}: {
  outline: OutlineEntry[];
  activeId: string | undefined;
}) {
  return (
    <nav className="outline-navigation" aria-label="文章大纲">
      <p className="panel-label">本页目录</p>
      <ul>
        {outline.map((heading) => (
          <li className={`outline-depth-${heading.depth}`} key={heading.id}>
            <a
              className={activeId === heading.id ? "is-current" : undefined}
              aria-current={activeId === heading.id ? "location" : undefined}
              href={`#${heading.id}`}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function ReaderWorkspace({ site, article, archive }: ReaderWorkspaceProps) {
  const [drawer, setDrawer] = useState<DrawerName>(null);
  const [activeId, setActiveId] = useState<string | undefined>(article.outline[0]?.id);
  const lastButton = useRef<HTMLButtonElement | null>(null);

  function openDrawer(name: Exclude<DrawerName, null>, button: HTMLButtonElement) {
    lastButton.current = button;
    setDrawer(name);
  }

  function closeDrawer() {
    setDrawer(null);
    window.setTimeout(() => lastButton.current?.focus(), 0);
  }

  useEffect(() => {
    if (!drawer) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDrawer();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawer]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    const headings = article.outline
      .map((heading) => document.getElementById(heading.id))
      .filter((heading): heading is HTMLElement => Boolean(heading));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: "-12% 0px -70% 0px" }
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [article.outline]);

  return (
    <main className="reader-page">
      <header className="reader-toolbar">
        <Link to="/" className="toolbar-brand">
          {site.name}
        </Link>
        <div>
          <button
            type="button"
            aria-label="打开文章目录"
            onClick={(event) => openDrawer("archive", event.currentTarget)}
          >
            文章
          </button>
          <button
            type="button"
            aria-label="打开文章大纲"
            onClick={(event) => openDrawer("outline", event.currentTarget)}
          >
            大纲
          </button>
        </div>
      </header>

      <aside className="reader-sidebar reader-sidebar-left">
        <Link to="/" className="sidebar-brand">
          {site.name}
        </Link>
        <ArchiveNavigation archive={archive} currentSlug={article.slug} />
      </aside>

      <article className="reading-column">
        <header className="article-header">
          <time dateTime={article.date}>{article.date.replaceAll("-", " / ")}</time>
          <h1>{article.title}</h1>
          <p>{article.summary}</p>
        </header>
        <div className="article-content" dangerouslySetInnerHTML={{ __html: article.html }} />
      </article>

      <aside className="reader-sidebar reader-sidebar-right">
        <OutlineNavigation outline={article.outline} activeId={activeId} />
      </aside>

      {drawer && (
        <div className="drawer-layer">
          <button className="drawer-overlay" type="button" aria-label="关闭弹层" onClick={closeDrawer} />
          <aside
            role="dialog"
            aria-label={drawer === "archive" ? "文章目录" : "文章大纲"}
            className={`drawer-panel drawer-${drawer}`}
          >
            <div className="drawer-heading">
              <span>{drawer === "archive" ? "文章目录" : "文章大纲"}</span>
              <button
                type="button"
                aria-label={drawer === "archive" ? "关闭文章目录" : "关闭文章大纲"}
                onClick={closeDrawer}
              >
                关闭
              </button>
            </div>
            {drawer === "archive" ? (
              <ArchiveNavigation archive={archive} currentSlug={article.slug} />
            ) : (
              <OutlineNavigation outline={article.outline} activeId={activeId} />
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
