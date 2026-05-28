import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import type { Article, ArchiveYear } from "../content/articles.server";
import type { SiteConfig } from "../site-config";
import { HomePage } from "./HomePage";
import { ReaderWorkspace } from "./ReaderWorkspace";

const site: SiteConfig = {
  name: "绿屋",
  description: "写作与阅读",
  bio: "记录技术与日常观察。",
  links: [{ label: "GitHub", href: "https://github.com/example" }]
};

const article: Article = {
  title: "建立安静的写作空间",
  date: "2026-05-25",
  summary: "从阅读节奏开始整理页面。",
  slug: "quiet-writing",
  html: '<h2 id="开始">开始</h2><p>正文。</p>',
  outline: [{ depth: 2, id: "开始", text: "开始" }]
};

const archive: ArchiveYear[] = [
  { year: "2026", months: [{ month: "05", articles: [article] }] }
];

describe("HomePage", () => {
  it("presents the identity, external links, and article reading entry", () => {
    render(
      <MemoryRouter>
        <HomePage site={site} articles={[article]} />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "绿屋" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/example"
    );
    expect(screen.getByRole("link", { name: "建立安静的写作空间" })).toHaveAttribute(
      "href",
      "/articles/quiet-writing/"
    );
    expect(screen.getByText("2026.05.25")).toBeInTheDocument();
  });
});

describe("ReaderWorkspace", () => {
  it("marks the current article and renders its outline navigation", () => {
    render(
      <MemoryRouter>
        <ReaderWorkspace site={site} article={article} archive={archive} />
      </MemoryRouter>
    );

    const archiveNavigation = screen.getByLabelText("文章归档");
    expect(within(archiveNavigation).getByText("建立安静的写作空间")).toHaveAttribute(
      "aria-current",
      "page"
    );
    const outlines = screen.getAllByLabelText("文章大纲");
    expect(within(outlines[0]).getByRole("link", { name: "开始" })).toHaveAttribute(
      "aria-current",
      "location"
    );
  });

  it("renders accessible resize handles for desktop sidebars", () => {
    render(
      <MemoryRouter>
        <ReaderWorkspace site={site} article={article} archive={archive} />
      </MemoryRouter>
    );

    const leftHandle = screen.getByRole("separator", { name: "调整文章归档宽度" });
    const rightHandle = screen.getByRole("separator", { name: "调整文章大纲宽度" });

    expect(leftHandle).toHaveAttribute("aria-orientation", "vertical");
    expect(leftHandle).toHaveAttribute("aria-valuemin", "192");
    expect(leftHandle).toHaveAttribute("aria-valuemax", "448");
    expect(rightHandle).toHaveAttribute("aria-orientation", "vertical");
    expect(rightHandle).toHaveAttribute("aria-valuemin", "192");
    expect(rightHandle).toHaveAttribute("aria-valuemax", "416");
  });

  it("opens and closes navigation drawers with buttons, overlay, and Escape", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ReaderWorkspace site={site} article={article} archive={archive} />
      </MemoryRouter>
    );

    const articlesButton = screen.getByRole("button", { name: "打开文章目录" });
    await user.click(articlesButton);
    expect(screen.getByRole("dialog", { name: "文章目录" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "文章目录" })).not.toBeInTheDocument();
    expect(articlesButton).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "打开文章大纲" }));
    expect(screen.getByRole("dialog", { name: "文章大纲" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "关闭弹层" }));
    expect(screen.queryByRole("dialog", { name: "文章大纲" })).not.toBeInTheDocument();
  });
});
