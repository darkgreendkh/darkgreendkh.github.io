import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { Link } from "react-router";

import type { Article, ArchiveYear, OutlineEntry } from "../content/articles.server";
import type { SiteConfig } from "../site-config";

type ReaderWorkspaceProps = {
  site: SiteConfig;
  article: Article;
  archive: ArchiveYear[];
};

type DrawerName = "archive" | "outline" | null;
type PanelSide = "left" | "right";
type PanelWidths = Record<PanelSide, number>;

const PANEL_STORAGE_KEY = "reader-panel-widths:v1";
const MIN_READING_WIDTH = 448;
const PANEL_LIMITS: Record<PanelSide, { defaultValue: number; min: number; max: number }> = {
  left: { defaultValue: 296, min: 192, max: 448 },
  right: { defaultValue: 268, min: 192, max: 416 }
};
const DEFAULT_PANEL_WIDTHS: PanelWidths = {
  left: PANEL_LIMITS.left.defaultValue,
  right: PANEL_LIMITS.right.defaultValue
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getViewportWidth() {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.innerWidth;
}

function constrainPanelWidths(widths: PanelWidths, activeSide?: PanelSide): PanelWidths {
  const constrained: PanelWidths = {
    left: clamp(widths.left, PANEL_LIMITS.left.min, PANEL_LIMITS.left.max),
    right: clamp(widths.right, PANEL_LIMITS.right.min, PANEL_LIMITS.right.max)
  };
  const viewportWidth = getViewportWidth();
  const maxCombinedWidth =
    typeof viewportWidth === "number"
      ? Math.max(PANEL_LIMITS.left.min + PANEL_LIMITS.right.min, viewportWidth - MIN_READING_WIDTH)
      : Number.POSITIVE_INFINITY;

  let overflow = constrained.left + constrained.right - maxCombinedWidth;
  if (overflow <= 0) {
    return constrained;
  }

  const sides: PanelSide[] = activeSide
    ? [activeSide, activeSide === "left" ? "right" : "left"]
    : ["right", "left"];

  for (const side of sides) {
    const reduction = Math.min(overflow, constrained[side] - PANEL_LIMITS[side].min);
    constrained[side] -= reduction;
    overflow -= reduction;
    if (overflow <= 0) {
      break;
    }
  }

  return constrained;
}

function readStoredPanelWidths(): PanelWidths | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(PANEL_STORAGE_KEY);
    if (!value) {
      return null;
    }
    const parsed = JSON.parse(value) as Partial<PanelWidths>;
    const left = parsed.left;
    const right = parsed.right;
    if (typeof left !== "number" || typeof right !== "number" || !Number.isFinite(left) || !Number.isFinite(right)) {
      return null;
    }
    return constrainPanelWidths({ left, right });
  } catch {
    return null;
  }
}

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

function ResizeHandle({
  side,
  value,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onKeyDown
}: {
  side: PanelSide;
  value: number;
  onPointerDown: (side: PanelSide, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  onKeyDown: (side: PanelSide, event: ReactKeyboardEvent<HTMLButtonElement>) => void;
}) {
  const label = side === "left" ? "调整文章归档宽度" : "调整文章大纲宽度";
  const limits = PANEL_LIMITS[side];

  return (
    <button
      type="button"
      className={`panel-resize-handle panel-resize-handle-${side}`}
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      aria-valuenow={Math.round(value)}
      onPointerDown={(event) => onPointerDown(side, event)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(event) => onKeyDown(side, event)}
    />
  );
}

export function ReaderWorkspace({ site, article, archive }: ReaderWorkspaceProps) {
  const [drawer, setDrawer] = useState<DrawerName>(null);
  const [activeId, setActiveId] = useState<string | undefined>(article.outline[0]?.id);
  const [panelWidths, setPanelWidths] = useState<PanelWidths>(DEFAULT_PANEL_WIDTHS);
  const [storageReady, setStorageReady] = useState(false);
  const lastButton = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef<{
    side: PanelSide;
    startX: number;
    startWidths: PanelWidths;
    pointerId: number;
  } | null>(null);

  function openDrawer(name: Exclude<DrawerName, null>, button: HTMLButtonElement) {
    lastButton.current = button;
    setDrawer(name);
  }

  function closeDrawer() {
    setDrawer(null);
    window.setTimeout(() => lastButton.current?.focus(), 0);
  }

  function handleResizePointerDown(side: PanelSide, event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      side,
      startX: event.clientX,
      startWidths: panelWidths,
      pointerId: event.pointerId
    };
  }

  function handleResizePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const movement = event.clientX - drag.startX;
    const nextValue = drag.side === "left" ? drag.startWidths.left + movement : drag.startWidths.right - movement;
    setPanelWidths(constrainPanelWidths({ ...drag.startWidths, [drag.side]: nextValue }, drag.side));
  }

  function handleResizePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  function handleResizeKeyDown(side: PanelSide, event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    setPanelWidths((current) => {
      if (event.key === "Home") {
        return constrainPanelWidths({ ...current, [side]: PANEL_LIMITS[side].min }, side);
      }
      if (event.key === "End") {
        return constrainPanelWidths({ ...current, [side]: PANEL_LIMITS[side].max }, side);
      }
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const delta = (side === "left" ? direction : -direction) * 16;
      return constrainPanelWidths({ ...current, [side]: current[side] + delta }, side);
    });
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

  useEffect(() => {
    const storedWidths = readStoredPanelWidths();
    if (storedWidths) {
      setPanelWidths(storedWidths);
    }
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(panelWidths));
  }, [panelWidths, storageReady]);

  useEffect(() => {
    function handleResize() {
      setPanelWidths((current) => constrainPanelWidths(current));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const readerStyle = {
    "--left-panel": `${panelWidths.left}px`,
    "--right-panel": `${panelWidths.right}px`
  } as CSSProperties;

  return (
    <main className="reader-page" style={readerStyle}>
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
        <ResizeHandle
          side="left"
          value={panelWidths.left}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onKeyDown={handleResizeKeyDown}
        />
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
        <ResizeHandle
          side="right"
          value={panelWidths.right}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onKeyDown={handleResizeKeyDown}
        />
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
